const MusicMetadata = require('music-metadata')
const FS = require('fs').promises
const Path = require('path')
const Base = require('./class.base')

module.exports = class MusicFolder extends Base {
  constructor (sourcePath, destPath) {
    super()

    this.trackMap = []
    this.sourcePath = sourcePath
    this.destPath = destPath
  }

  async addOrResolveFile (path, resolveCompilationFile) {
    const fileMetadata = await MusicMetadata.parseFile(path)
    const fileInfo = await Path.parse(path)
    const album = fileMetadata.common.album?.trim() || 'Unknown Album'
    const trackNo = fileMetadata.common.track?.no
    const compilation = fileMetadata.common.compilation
    let artist = fileMetadata.common.albumartist?.trim() || fileMetadata.common.artists?.join(', ') || fileMetadata.common.artist?.trim() || 'Unknown Artist'
    const originalArtist = artist
    let title = fileMetadata.common.title?.trim() || fileInfo.name

    if (compilation && !resolveCompilationFile) {
      title = `${fileMetadata.common.artists?.join(', ') || artist} - ${title}`
      artist = 'Various Artists'
    }

    const fileStat = await FS.stat(path)
    const createdTime = fileStat.atime
    const modifiedTime = fileStat.mtime

    if (resolveCompilationFile) {
      resolveCompilationFile.title = title
      resolveCompilationFile.artist = artist
      resolveCompilationFile.compilation = false

      return
    }

    this.trackMap.push({
      artist,
      originalArtist,
      album,
      title,
      trackNo,
      ext: fileInfo.ext,
      createdTime,
      modifiedTime,
      compilation,
      parentFolder: null,
      path
    })
  }

  async traverseDirectory (path) {
    const directoryContents = await FS.readdir(path, { withFileTypes: true })
    for (const item of directoryContents) {
      const ignoreItems = ['.DS_Store', '.localized', '.Media Preferences.plist']
      if (ignoreItems.some(ignoreItem => ignoreItem === item.name)) continue

      const itemPath = `${path}/${item.name}`
      if (item.isDirectory()) {
        await this.traverseDirectory(itemPath)
      } else {
        await this.addOrResolveFile(itemPath)
      }
    }
  }

  async resolveCompilations () {
    const compilationMap = {}

    for (const track of this.trackMap.filter(track => track.compilation)) {
      if (!compilationMap[track.album]) {
        compilationMap[track.album] = {}
      }
      if (!compilationMap[track.album][track.originalArtist]) {
        compilationMap[track.album][track.originalArtist] = []
      }
      compilationMap[track.album][track.originalArtist].push(track)
    }

    for (const album in compilationMap) {
      const albumEntries = compilationMap[album]
      const albumArtists = Object.keys(albumEntries)

      if (albumArtists.length === 1 && albumArtists[0] !== 'Various Artists') {
        for (const artist in albumEntries) {
          const artistFiles = albumEntries[artist]
          for (const artistFile of artistFiles) {
            await this.addOrResolveFile(artistFile.path, artistFile)
          }
        }
      }
    }
  }

  async buildTrackMap () {
    await this.traverseDirectory(this.sourcePath)
    await this.resolveCompilations()
  }
}
