require('dotenv').config()
const PList = require('plist')
const FS = require('fs').promises
const MusicFolder = require('./classes/class.musicFolder.js')

const updateTrackLocations = async tracks => {
  for (const track of tracks) {
    track.Location = track.Location.replace(process.env.ITUNES_LIBRARY_OLD_MUSIC_PATH, process.env.SOURCE_PATH)
  }
}

const processTrackSegments = async (playlists, tracks) => {
  const playlist = playlists.find(playlist => playlist.Name === process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST)
  if (!playlist) {
    return {
      All: tracks
    }
  }
  const segmentedFolder = process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST_FOLDER || process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST
  const unsegmentedFolder = process.env.ITUNES_LIBRARY_UNSEGMENTED_FOLDER || 'Other'
  const segmentedTracks = {
    [segmentedFolder]: [],
    [unsegmentedFolder]: []
  }
  const playlistTracks = playlist['Playlist Items'].map(item => item['Track ID'])

  for (const track of tracks) {
    if (playlistTracks.some(playlistTrackID => playlistTrackID === track['Track ID'])) {
      segmentedTracks[segmentedFolder].push(track)
    } else {
      segmentedTracks[unsegmentedFolder].push(track)
    }
  }

  return segmentedTracks
}

const processiTunesLibrary = async () => {
  const iTunesLibraryFileData = await FS.readFile(process.env.ITUNES_LIBRARY_PATH)
  const iTunesLibraryData = PList.parse(iTunesLibraryFileData.toString())
  let tracks = Object.values(iTunesLibraryData.Tracks).filter(track => track.Location)
  if (process.env.ITUNES_LIBRARY_OLD_MUSIC_PATH) {
    await updateTrackLocations(tracks)
  }
  if (process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST) {
    tracks = await processTrackSegments(iTunesLibraryData.Playlists, tracks)
  } else {
    tracks = {
      All: tracks
    }
  }
  console.log(tracks)
}

const initScript = async () => {
  if (process.env.ITUNES_LIBRARY_PATH) {
    await processiTunesLibrary()
  } else {
    const OrganizeMusicFolder = new MusicFolder(process.env.SOURCE_PATH, process.env.DEST_PATH)
    await OrganizeMusicFolder.buildTrackMap()
    await OrganizeMusicFolder.processTracks()
  }
}

initScript()
