const SanitizeFilename = require('sanitize-filename')
const ReplaceSpecialCharacters = require('replace-special-characters')
const FS = require('fs').promises

module.exports = class Base {
  async processTracks () {
    for (const track of this.trackMap) {
      try {
        await FS.access(track.path)
      } catch (error) {
        console.error(`File does not exist: ${track.path}`)
        continue
      }

      const artistFolderName = ReplaceSpecialCharacters(SanitizeFilename(track.artist, { replacement: '_' }))
      const albumFolderName = ReplaceSpecialCharacters(SanitizeFilename(track.album, { replacement: '_' }))
      const parentFolderName = track.parentFolder ? ReplaceSpecialCharacters(SanitizeFilename(track.parentFolder, { replacement: '_' })) : ''
      const fileName = `${track.trackNo ? `${track.trackNo}. ` : ''}${ReplaceSpecialCharacters(SanitizeFilename(track.title))}${track.ext}`

      const parentFolderPath = `${this.destPath}${parentFolderName ? `/${parentFolderName}` : ''}`
      const artistFolderPath = `${parentFolderPath}/${artistFolderName}`
      const albumFolderPath = `${artistFolderPath}/${albumFolderName}`

      if (parentFolderName) {
        try {
          await FS.access(parentFolderPath)
        } catch (error) {
          console.log(`Creating folder ${parentFolderPath}`)
          await FS.mkdir(parentFolderPath)
        }
      }
      try {
        await FS.access(artistFolderPath)
      } catch (error) {
        console.log(`Creating folder ${artistFolderPath}`)
        await FS.mkdir(artistFolderPath)
      }
      try {
        await FS.access(albumFolderPath)
      } catch (error) {
        console.log(`Creating folder ${albumFolderPath}`)
        await FS.mkdir(albumFolderPath)
      }
      const newFilePath = `${albumFolderPath}/${fileName}`

      console.log(`Copying file ${track.path} to ${newFilePath}`)
      await FS.copyFile(track.path, `${newFilePath}`)
      await FS.utimes(newFilePath, track.createdTime, track.modifiedTime)
      console.log('Finished copying')
    }
  }
}
