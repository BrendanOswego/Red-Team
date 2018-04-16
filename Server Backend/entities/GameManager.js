'use strict'
/**
 * Imports files
 */
const axios = require('axios')
const Gameboard = require('./Gameboard')
require('../helpers/Debug')
const sc = require('../helpers/ScoreCalculator')
const rh = require('../helpers/ResponseHandler')
const ex = require('../helpers/Extractor')
const dg = require('../helpers/Debug')
const PlayerManager = require('./PlayerManager')
const FrontendManager = require('./FrontendManager')

let state = Object.freeze({
  IN_GAME: 0,
  GAME_OVER: 1
})

class GameManager {
  constructor(io, serverManager) {
    this._gameBoard = new Gameboard()
    this._serverManager = serverManager
    this._playerManagers = []
    this._frontendManager = null
    this._tileScores = []
    this._greenScore = 0
    this._error = 0
    this._yellowScore = 0
    this._swaps = 0
    this._io = io
    this.init()
  }

  /**
   * Server manager getter
   */
  get serverManager() {
    return this._serverManager
  }

  /**
   * Board getter
   */
  get board() {
    return this._gameBoard
  }

  init() {
    this.createPlayerManagers()
    this.createFrontendManager()
  }

  /**
   * Removes player from server manager count
   */
  removePlayer() {
    this._serverManager.updateConnectionCounts('p', -1)
  }

  /**
     * Creates 4 player managers
     */
  createPlayerManagers() {
    dg(`creating 4 player managers`, 'debug')
    for (let i = 0; i < 4; i++) {
      this._playerManagers.push(new PlayerManager(i, this))
      this._playerManagers[0].isTurn = true
    }
    dg('player managers created', 'debug')
  }

  /**
     * Creates only one frontend manager instance
     */
  createFrontendManager() {
    if (this._frontendManager === null) {
      this._frontendManager = new FrontendManager()
      dg('frontend created', 'debug')
    }
  }

  /**
   * Adds information for the frontend
   * @param {Object} socket - socket object
   */
  addFrontend(socket) {
    if (this._frontendManager.id === null) {
      this._frontendManager.createHandshakeWithFrontend(socket)
    }
  }

  /**
     * Adds a client to a PlayerManager that does not have any data inside of it
     * @param {String} name - name of player
     * @param {String} team - team player is on
     * @param {Boolean} isAI - AI or not
     * @param {Object} socket - socket object
     */
  addPlayer(name, team, isAI, socket) {
    for (let manager of this._playerManagers) {
      if (manager.id === null) {
        manager.createHandshakeWithClient(name, team, isAI, socket)
        this.updateFrontendData()
        dg(`client added to player manager ${manager.position}`, 'debug')
        return true
      }
    }
    return false
  }

  /**
     * Removes an AI player if an actual person tries to connect and there are AI playing
     * @param {String} name - name of player
     * @param {String} team - name of team
     * @param {Object} socket - socket object
     */
  removeAI(name, team, socket) {
    for (let manager of this._playerManagers) {
      if (this._frontendManager.socketId !== null && manager.isAI) {
        dg(`removing ai from position ${manager.position}`, 'debug')
        this._frontendManager.sendEvent('removeAI', manager.position)
        manager.removePlayerInformation()
        manager.createHandshakeWithClient(name, team, false, socket)
        return
      }
    }
  }

  /**
   * Updates the frontend
   */
  updateFrontendData() {
    let data = {
      board: this.board.sendableBoard(),
      players: this._playerManagers
    }

    this._frontendManager.sendEvent('updateState', data)
  }

  /**
  * Updates clients' data
  */
  updateClientData() {
    for (let manager of this._playerManagers) {
      if (manager.id !== null) {
        manager.sendEvent('dataUpdate')
      }
    }
  }

  swapMade(manager) {
    this._swaps++
    if (this._swaps === 4) {
      this.gameOver()
      return
    }
    manager.manipulateHand(manager.tiles)
    this._io.emit('gameEvent', {
      action: `${manager.name} swapped tiles`
    })
    this.updateTurn(manager, true)
  }

  /**
   * Updates who's turn it is
   */
  updateTurn(manager, swapped) {
    let position = manager.position
    dg(`it was player ${manager.position}'s turn`, 'debug')
    manager.isTurn = false
    do {
      position++
      if (position > 3) {
        position = 0
      }
    } while (this._playerManagers[position].id === null)
    this._playerManagers[position].isTurn = true
    if (!swapped) {
      this._swaps = 0
    }
    dg(`it is now player ${position}'s turn`, 'debug')

    this.updateClientData()
    this.updateFrontendData()
  }

  gameOver() {
    dg('all players have swapped tiles, game over', 'info')
    for (let manager of this._playerManagers) {
      if (manager.id !== null) {
        manager.isTurn = false
        manager.sendEvent('dataUpdate')
      }
    }

    this._swaps = 0

    let finalScores = []
    let winner = null
    let highestScore = 0
    for (let manager of this._playerManagers) {
      if (manager.id !== null) {
        if (manager.score > highestScore) {
          highestScore = manager.score
          winner = manager.name
        }
        let data = {
          name: manager.name,
          score: manager.score
        }
        finalScores.push(data)
      }
    }
    this._io.emit('gameOver', {
      scores: finalScores,
      winner: winner,
      winningTeam: this._yellowScore > this._greenScore ? 'Yellow' : 'Green'
    })

    let timeUntil = 5
    let timer = setInterval(() => {
      if (timeUntil !== 0) {
        console.log(timeUntil)
        this._io.emit('newGameCountdown', {
          timer: timeUntil
        })
        timeUntil--
      } else {
        clearInterval(timer)
        console.log('starting new game')
        this.startNewGame()
      }
    }, 1000)
  }

  /**
   * Sends out a boardUpdate event to all clients
   */
  boardUpdate() {
    this._io.emit('boardUpdate', {
      board: this.board.sendableBoard(),
      yellow: this._yellowScore,
      green: this._greenScore
    })
  }

  play(newBoard, player) {
    const letters = ex.extractLetters(newBoard, this._gameBoard.board, player)

    if (!letters) {
      let response = {
        error: 7,
        data: 'cheater'
      }
      return rh(response, player, this)
    }

    const words = ex.extractWords(letters, newBoard)

    this.wordValidation(words)
      .then(response => {
        let boardPlay = null
        if (response === true) {
          // if invalid type of play, gets the word that was invalid, else is undefined
          boardPlay = this._gameBoard.placeWords(words, player)
        } else {
          // if the word is invalid
          return rh(response, player, this)
        }
        // if the board has attempted to play a word
        if (boardPlay.error === 0) {
          let ls = letters.map(l => l.letter)
          player.manipulateHand(ls)
        }
        return rh(boardPlay, player, this)
      })
      .catch(e => {
        console.log(`ERROR: ${e}`.error)
      })
  }

  /**
   * Checks to see if word(s) are in the DB
   * @param {Array} words - words to be checked against the DB
   */
  wordValidation(words) {
    const search = words.map(s => s.word).join(',')

    dg('checking words against database', 'debug')
    return axios.get('http://localhost:8090/dictionary/validate?words=' + search)
      .then(res => {
        return this.pruneResults(res.data)
      })
  }

  /**
   * Prunes the data sent back from the DB to check if anywords are either invalid or bad words
   * @param {Array} response - word data sent back from DB
   */
  pruneResults(response) {
    dg('pruning results of database response', 'debug')
    for (let word of response) {
      if (word.bad) {
        return {
          error: 6,
          data: word.word
        }
      }
      if (!word.valid) {
        return {
          error: 1,
          data: word.word
        }
      }
    }

    return true
  }

  /**
   * Calculates the score of a play
   * @param {Object} player - player to add score to
   * @param {Array} words - array of words to calculate score for
   */
  calculateScore(player, words) {
    let score = sc(words, this._gameBoard.board)

    this.addScore(player, score)
    this.updateTurn(player, false)
    return score
  }

  /**
   * Adds the score to the player's score and the team they are on
   * @param {Object} player - player to add score to
   * @param {Number} score - score
   */
  addScore(player, score) {
    // Need to update DB as well
    player.addScore(score)

    switch (player.team) {
      case 'Green':
        this._greenScore += score
        break
      case 'Yellow':
        this._yellowScore += score
        break
    }
  }

  /**
   * Starts a new game by resetting everything
   */
  startNewGame() {
    this.resetScores()
    this.resetGameboard()
    this._io.emit('newGame')
    this.boardUpdate()
    this.updateClientData()
    this._io.emit('gameEvent', {
      action: 'New game started'
    })
  }

  /**
   * Creates a new gameboard and initializes it
   */
  resetGameboard() {
    this._gameBoard = new Gameboard()
    this._playerManagers[0].isTurn = true
  }

  /**
   * Resets all players' scores
   */
  resetScores() {
    this._greenScore = 0
    this._yellowScore = 0

    this._playerManagers.map(p => {
      p.resetScore()
    })
  }
}

/**
 * Exports this file so it can be used by other files.  Keep this at the bottom.
 */
module.exports = GameManager
