const SanitizeFilename = require('sanitize-filename')
const ReplaceSpecialCharacters = require('replace-special-characters')
const FS = require('fs').promises

module.exports = class Base {
  async processTracks () {
    for (const track of this.trackMap) {
      const artistFolderName = ReplaceSpecialCharacters(SanitizeFilename(track.artist, { replacement: '_' }))
      const albumFolderName = ReplaceSpecialCharacters(SanitizeFilename(track.album, { replacement: '_' }))
      const fileName = `${track.trackNo ? `${track.trackNo}. ` : ''}${ReplaceSpecialCharacters(SanitizeFilename(track.title))}${track.ext}`

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
      await FS.copyFile(track.path, `${newFilePath}`)
      const fileStat = await FS.stat(track.path)
      await FS.utimes(newFilePath, fileStat.atime, fileStat.mtime)
    }
  }
}
