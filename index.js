require('dotenv').config()
const MusicFolder = require('./classes/class.musicFolder.js')
const iTunesLibrary = require('./classes/class.iTunes.js')

const initScript = async () => {
  if (process.env.ITUNES_LIBRARY_PATH) {
    // eslint-disable-next-line new-cap
    const OrganizeiTunesFolder = new iTunesLibrary(process.env.SOURCE_PATH, process.env.DEST_PATH)
    await OrganizeiTunesFolder.buildTrackMap()
    await OrganizeiTunesFolder.processTracks()
  } else {
    const OrganizeMusicFolder = new MusicFolder(process.env.SOURCE_PATH, process.env.DEST_PATH)
    await OrganizeMusicFolder.buildTrackMap()
    await OrganizeMusicFolder.processTracks()
  }
}

initScript()
