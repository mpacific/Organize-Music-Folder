const MusicMetadata = require('music-metadata')
const SanitizeFilename = require('sanitize-filename')
const ReplaceSpecialCharacters = require('replace-special-characters')
const FS = require('fs').promises
const path = require('path')

module.exports = class MusicFolder {
  constructor (sourcePath, destPath) {
    this.sourcePath = sourcePath
    this.destPath = destPath
  }

  async getFileInfo (filePath, ignoreCompilation) {
    const fileMetadata = await MusicMetadata.parseFile(filePath)
    const fileInfo = await path.parse(filePath)
    const album = fileMetadata.common.album?.trim() || 'Unknown Album'
    const track = fileMetadata.common.track?.no
    let artist = fileMetadata.common.albumartist?.trim() || fileMetadata.common.artists?.join(', ') || fileMetadata.common.artist?.trim() || 'Unknown Artist'
    let title = fileMetadata.common.title?.trim() || fileInfo.name

    if (ignoreCompilation) {
      artist = fileMetadata.common.artists?.join(', ') || fileMetadata.common.artist?.trim() || 'Unknown Artist'
    }

    if (fileMetadata.common.compilation && !ignoreCompilation) {
      title = `${fileMetadata.common.artists?.join(', ') || artist} - ${title}`
      artist = 'Various Artists'
    }

    return { album, track, artist, title, fileInfoName: fileInfo.name, fileInfoExt: fileInfo.ext }
  }

  async processFile (filePath, ignoreCompilation = false) {
    console.log(`\nOriginal File: ${filePath}`)

    try {
      const { album, track, artist, title, fileInfoName, fileInfoExt } = await this.getFileInfo(filePath, ignoreCompilation)

      const artistFolderName = ReplaceSpecialCharacters(SanitizeFilename(artist, { replacement: '_' }))
      const albumFolderName = ReplaceSpecialCharacters(SanitizeFilename(album, { replacement: '_' }))
      const fileName = `${track ? `${track}. ` : ''}${ReplaceSpecialCharacters(SanitizeFilename(title || fileInfoName))}${fileInfoExt}`

      const artistFolderPath = `${this.destPath}/${artistFolderName}`
      const albumFolderPath = `${artistFolderPath}/${albumFolderName}`

      try {
        await FS.access(artistFolderPath)
      } catch (error) {
        await FS.mkdir(artistFolderPath)
      }
      try {
        await FS.access(albumFolderPath)
      } catch (error) {
        await FS.mkdir(albumFolderPath)
      }

      const newFilePath = `${albumFolderPath}/${fileName}`
      console.log(`-> Copying to ${newFilePath}`)
      await FS.copyFile(filePath, `${newFilePath}`)
      const fileStat = await FS.stat(filePath)
      await FS.utimes(newFilePath, fileStat.atime, fileStat.mtime)
      console.log(`-> Copied to ${newFilePath}`)
    } catch (error) {
      console.log(`Error (${filePath}): ${error}`, error)
    }
  }

  async followPath (resourcePath) {
    console.log(`\n Directory: ${resourcePath}`)

    const directoryContents = await FS.readdir(resourcePath, { withFileTypes: true })
    for (const item of directoryContents) {
      const ignoreItems = ['.DS_Store', '.localized', '.Media Preferences.plist']
      if (ignoreItems.some(ignoreItem => ignoreItem === item.name)) continue

      const itemPath = `${resourcePath}/${item.name}`
      if (item.isDirectory()) {
        await this.followPath(itemPath)
      } else {
        await this.processFile(itemPath)
      }
    }
  }

  async checkCompilation (compilationPath) {
    const directoryContents = await FS.readdir(compilationPath, { withFileTypes: true })
    const artists = []
    for (const item of directoryContents) {
      const itemPath = `${compilationPath}/${item.name}`
      const { artist } = await this.getFileInfo(itemPath, true)

      if (!artists.some(storedArtist => storedArtist === artist)) {
        artists.push(artist)
      }
    }
    if (artists.length === 1 && artists[0] !== 'Various Artists') {
      for (const item of directoryContents) {
        const itemPath = `${compilationPath}/${item.name}`
        await this.processFile(itemPath, true)
      }
      await FS.rm(compilationPath, { recursive: true })
    }
  }

  async checkCompilations (compilationsPath) {
    const directoryContents = await FS.readdir(compilationsPath, { withFileTypes: true })
    for (const item of directoryContents) {
      if (item.isDirectory()) {
        const itemPath = `${compilationsPath}/${item.name}`
        await this.checkCompilation(itemPath)
      }
    }
  }

  async doSort () {
    await this.followPath(this.sourcePath)
    await this.checkCompilations(`${this.destPath}/Various Artists`)
  }
}
