require('dotenv').config()
const MusicFolder = require('./classes/class.musicFolder.js')

const doScript = async () => {
  const OrganizeMusicFolder = new MusicFolder(process.env.SOURCE_PATH, process.env.DEST_PATH)
  await OrganizeMusicFolder.doSort()
}

doScript()
