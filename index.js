require("dotenv").config();
const MusicFolder = require("./classes/class.musicFolder.js");
const iTunesLibrary = require("./classes/class.iTunes.js");

const initScript = async () => {
  let OrganizeStrategy;
  if (process.env.ITUNES_LIBRARY_PATH) {
    // eslint-disable-next-line new-cap
    OrganizeStrategy = new iTunesLibrary(
      process.env.SOURCE_PATH,
      process.env.DEST_PATH
    );
  } else {
    OrganizeStrategy = new MusicFolder(
      process.env.SOURCE_PATH,
      process.env.DEST_PATH
    );
  }
  await OrganizeStrategy.buildTrackMap();
  await OrganizeStrategy.processTracks();
};

initScript();
