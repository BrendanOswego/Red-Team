const GB = require('../entities/Gameboard')
const Tile = require('../entities/Tile')
const GameManager = require('../entities/GameManager')
const PlayerManager = require('../entities/PlayerManager')
const FrontendManager = require('../entities/FrontendManager')
const Extractor = require('../helpers/Extractor')

describe('Game Manager tests', () => {
})

describe('Extractor tests', () => {
  it('should extract letter A from board', () => {
    const currentBoard = new GB()
    const player = new PlayerManager(null, null)
    player.tiles = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

    let board = new Array(11)

    for (let i = 0; i < board.length; i++) {
      board[i] = new Array(11)

      for (let j = 0; j < board[0].length; j++) {
        board[i][j] = null
      }
    }

    board[0][0] = 'A'

    let letters = Extractor.extractLetters(board, currentBoard.board, player)

    expect(letters).toEqual([{letter: 'A', x: 0, y: 0}])
  })

  it('should extract letter A,B,C from board', () => {
    const currentBoard = new GB()
    const player = new PlayerManager(null, null)
    player.tiles = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

    let board = new Array(11)

    for (let i = 0; i < board.length; i++) {
      board[i] = new Array(11)

      for (let j = 0; j < board[0].length; j++) {
        board[i][j] = null
      }
    }

    board[0][0] = 'A'
    board[5][5] = 'B'
    board[10][10] = 'C'

    let letters = Extractor.extractLetters(board, currentBoard.board, player)

    expect(letters).toEqual([{letter: 'A', x: 0, y: 0}, {letter: 'B', x: 5, y: 5}, {letter: 'C', x: 10, y: 10}])
  })

  it('should detect cheating hand', () => {
    const currentBoard = new GB()
    const player = new PlayerManager(null, null)
    player.tiles = ['A', 'B', 'Q', 'D', 'E', 'F', 'G']

    let board = new Array(11)

    for (let i = 0; i < board.length; i++) {
      board[i] = new Array(11)

      for (let j = 0; j < board[0].length; j++) {
        board[i][j] = null
      }
    }

    board[0][0] = 'A'
    board[5][5] = 'B'
    board[10][10] = 'C'

    let letters = Extractor.extractLetters(board, currentBoard.board, player)

    expect(letters).toEqual(false)
  })

  it('should extract word BOB from board', () => {
    let board = new Array(11)

    for (let i = 0; i < board.length; i++) {
      board[i] = new Array(11)

      for (let j = 0; j < board[0].length; j++) {
        board[i][j] = null
      }
    }

    board[0][0] = 'B'
    board[0][1] = 'O'
    board[0][2] = 'B'

    let words = Extractor.extractWords([{letter: 'B', x: 0, y: 0}, {letter: 'O', x: 1, y: 0}, {letter: 'B', x: 2, y: 0}], board)

    expect(words).toEqual([{word: 'BOB', x: 0, y: 0, h: true}])
  })
})

//   it('should extract word BOB, MOM, and TOM from board', () => {
//     const gm = new GameManager()

//     let board = new Array(11)

//     for (let i = 0; i < board.length; i++) {
//       board[i] = new Array(11)

//       for (let j = 0; j < board[0].length; j++) {
//         board[i][j] = null
//       }
//     }

//     board[0][0] = 'B'
//     board[0][1] = 'O'
//     board[0][2] = 'B'

//     board[0][5] = 'M'
//     board[0][6] = 'O'
//     board[0][7] = 'M'

//     board[5][3] = 'T'
//     board[5][4] = 'O'
//     board[5][5] = 'M'

//     let words = Extractor.extractWords([
//       {letter: 'B', x: 0, y: 0}, {letter: 'O', x: 1, y: 0}, {letter: 'B', x: 2, y: 0},
//       {letter: 'M', x: 5, y: 0}, {letter: 'O', x: 6, y: 0}, {letter: 'M', x: 7, y: 0},
//       {letter: 'T', x: 3, y: 5}, {letter: 'O', x: 4, y: 5}, {letter: 'M', x: 5, y: 5}
//     ], board)

//     expect(words).toEqual([
//       {word: 'BOB', x: 0, y: 0, h: true},
//       {word: 'MOM', x: 5, y: 0, h: true},
//       {word: 'TOM', x: 3, y: 5, h: true}
//     ])
//   })
// })

describe('Gameboard tests', () => {
  it('Gameboard should be created', () => {
    expect(new GB()).toBeTruthy()
  })

  it('Gameboard should be initialized', () => {
    const g = new GB()

    expect(g.init()).toBe(true)
  })

  it('Gameboard should not be re-initialized', () => {
    const g = new GB()

    g.init()

    expect(g.init()).toBe(true)
  })

  it('Gameboard should place word "OSWEGO" horizontally from (5,5) to (10, 5)', () => {
    const g = new GB()

    const word = {
      word: 'oswego',
      x: 5,
      y: 5,
      h: true
    }

    const play = g.placeWords([word])

    expect(play.error).toBe(0)
  })

  it('Gameboard should place word "OSWEGO" vertically from (5,5) to (5, 10)', () => {
    const g = new GB()

    const word = {
      word: 'oswego',
      x: 5,
      y: 5,
      h: false
    }

    const play = g.placeWords([word])

    expect(play.error).toBe(0)
  })

  it('Gameboard should place a horizontal word in the cross section of a vertical word', () => {
    const g = new GB()

    const word = {
      word: 'oswego',
      x: 5,
      y: 5,
      h: false
    }

    const word2 = {
      word: 'bed',
      x: 4,
      y: 8,
      h: true
    }

    const play = g.placeWords([word, word2])

    expect(play.error).toBe(0)
  })

  it('Gameboard should not place a horizontal word in the cross section of a vertical word', () => {
    const g = new GB()

    const word = {
      word: 'oswego',
      x: 5,
      y: 5,
      h: false
    }

    const word2 = {
      word: 'bad',
      x: 4,
      y: 8,
      h: true
    }

    const play = g.placeWords([word, word2])

    expect(play.error).toBe(3)
  })

  it('Gameboard should place a vertical word in the cross section of a horizontal word', () => {
    const g = new GB()

    const word = {
      word: 'bed',
      x: 5,
      y: 5,
      h: true
    }

    const word2 = {
      word: 'oswego',
      x: 6,
      y: 2,
      h: false
    }

    const play = g.placeWords([word, word2])

    expect(play.error).toBe(0)
  })

  it('Gameboard should not place a vertical word in the cross section of a horizontal word', () => {
    const g = new GB()

    const word = {
      word: 'bad',
      x: 5,
      y: 5,
      h: true
    }

    const word2 = {
      word: 'oswego',
      x: 6,
      y: 2,
      h: false
    }

    const play = g.placeWords([word, word2])

    expect(play.error).toBe(3)
  })

  it('Gameboard should return error trying to place a word outside the bounds of the board', () => {
    const g = new GB()

    const word = {
      word: 'fantastic',
      x: 5,
      y: 5,
      h: true
    }

    const play = g.placeWords([word])

    expect(play.error).toBe(2)
  })

  it('Gameboard should place first word over the center tile', () => {
    const g = new GB()

    const word = {
      word: 'oswego',
      x: 5,
      y: 5,
      h: true
    }

    const play = g.placeWords([word])

    expect(play.error).toBe(0)
  })

  it('Gameboard should not place first word anywhere but over the center tile', () => {
    const g = new GB()

    const word = {
      word: 'oswego',
      x: 3,
      y: 5,
      h: false
    }

    const play = g.placeWords([word])

    expect(play.error).toBe(4)
  })

  it('Gameboard should not place a word that is not attached to previously played words', () => {
    const g = new GB()

    const word = {
      word: 'bad',
      x: 5,
      y: 5,
      h: true
    }

    const word2 = {
      word: 'oswego',
      x: 2,
      y: 1,
      h: false
    }

    g.placeWords([word])
    const play = g.placeWords([word2])

    expect(play.error).toBe(5)
  })

  it('Gameboard should send a completely null board', () => {
    const g = new GB()

    const g1 = new GB()

    expect(g.sendableBoard()).toEqual(g1.sendableBoard())
  })

  it('Gameboard should return a null gameboard object', () => {
    const g = new GB()

    g.board = null

    expect(g.board).toBe(null)
  })
})

describe('Tile tests', () => {
  it('Tile should be created', () => {
    const tile = new Tile(1, 1, null, null)

    expect(tile).toBeTruthy()
  })

  it('Tile should be at x = 1', () => {
    const tile = new Tile(1, 1, null, null)

    expect(tile.x).toBe(1)
  })

  it('Tile should be at y = 1', () => {
    const tile = new Tile(1, 1, null, null)

    expect(tile.y).toBe(1)
  })

  it('Tile should be have a multiplier type of word', () => {
    const tile = new Tile(1, 1, 'word', null)

    expect(tile.multiplierType).toBe('word')
  })

  it('Tile should be have a multiplier of 2', () => {
    const tile = new Tile(1, 1, null, 2)

    expect(tile.multiplier).toBe(2)
  })

  it('Tile should be the letter "Q"', () => {
    const tile = new Tile(1, 1, null, null)

    tile.letter = 'Q'

    expect(tile.letter).toBe('Q')
  })

  it('Tile should have a letter placed', () => {
    const tile = new Tile(1, 1, null, null)

    tile.letter = 'Q'

    expect(tile.letterPlaced).toBe(true)
  })

  it('Tile should not have a letter placed', () => {
    const tile = new Tile(1, 1, null, null)

    expect(tile.letterPlaced).toBe(false)
  })

  it('Tile should be played by BOB', () => {
    const tile = new Tile(1, 1, null, null)

    tile.playedBy = 'BOB'

    expect(tile.playedBy).toBe('BOB')
  })

  it('Tile should be played at NOW', () => {
    const tile = new Tile(1, 1, null, null)

    let time = new Date()

    tile.timePlayedAt = time

    expect(tile.timePlayedAt).toEqual(time)
  })

  it('Tile should have multiplier type of null', () => {
    const tile = new Tile(1, 1, 'word', null)

    tile.multiplierType = null

    expect(tile.multiplierType).toBe(null)
  })

  it('Tile should have multiplier of null', () => {
    const tile = new Tile(1, 1, null, 2)

    tile.multiplier = null

    expect(tile.multiplier).toBe(null)
  })
})
