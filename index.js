require('dotenv').config()
const MusicMetadata = require('music-metadata')
const SanitizeFilename = require('sanitize-filename')
const ReplaceSpecialCharacters = require('replace-special-characters')
const PList = require('plist')
const FS = require('fs').promises
const path = require('path')

// Change sourcePath to where your original Music folder lives
const sourcePath = process.env.SOURCE_PATH
const destPath = process.env.DEST_PATH

const getFileInfo = async (filePath, ignoreCompilation) => {
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

const processFile = async (filePath, ignoreCompilation = false) => {
  console.log(`\nOriginal File: ${filePath}`)

  try {
    const { album, track, artist, title, fileInfoName, fileInfoExt } = await getFileInfo(filePath, ignoreCompilation)

    const artistFolderName = ReplaceSpecialCharacters(SanitizeFilename(artist, { replacement: '_' }))
    const albumFolderName = ReplaceSpecialCharacters(SanitizeFilename(album, { replacement: '_' }))
    const fileName = `${track ? `${track}. ` : ''}${ReplaceSpecialCharacters(SanitizeFilename(title || fileInfoName))}${fileInfoExt}`

    const artistFolderPath = `${destPath}/${artistFolderName}`
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

    console.log(`-> Copying to ${albumFolderPath}/${fileName}`)
    await FS.copyFile(filePath, `${albumFolderPath}/${fileName}`)
    const oldFileStat = await FS.stat(filePath)
    await FS.utimes(`${albumFolderPath}/${fileName}`, oldFileStat.atime, oldFileStat.mtime)
    console.log(`-> Copied to ${albumFolderPath}/${fileName}`)
  } catch (error) {
    console.log(`Error (${filePath}): ${error}`, error)
  }
}

const followPath = async (resourcePath) => {
  console.log(`\n Directory: ${resourcePath}`)

  const directoryContents = await FS.readdir(resourcePath, { withFileTypes: true })
  for (const item of directoryContents) {
    const ignoreItems = ['.DS_Store', '.localized', '.Media Preferences.plist']
    if (ignoreItems.some(ignoreItem => ignoreItem === item.name)) continue

    const itemPath = `${resourcePath}/${item.name}`
    if (item.isDirectory()) {
      await followPath(itemPath)
    } else {
      await processFile(itemPath)
    }
  }
}

const checkCompilation = async compilationPath => {
  const directoryContents = await FS.readdir(compilationPath, { withFileTypes: true })
  const artists = []
  for (const item of directoryContents) {
    const itemPath = `${compilationPath}/${item.name}`
    const { artist } = await getFileInfo(itemPath, true)

    if (!artists.some(storedArtist => storedArtist === artist)) {
      artists.push(artist)
    }
  }
  if (artists.length === 1 && artists[0] !== 'Various Artists') {
    for (const item of directoryContents) {
      const itemPath = `${compilationPath}/${item.name}`
      await processFile(itemPath, true)
    }
    await FS.rm(compilationPath, { recursive: true })
  }
}

const checkCompilations = async compilationsPath => {
  const directoryContents = await FS.readdir(compilationsPath, { withFileTypes: true })
  for (const item of directoryContents) {
    if (item.isDirectory()) {
      const itemPath = `${compilationsPath}/${item.name}`
      await checkCompilation(itemPath)
    }
  }
}

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

const doScript = async () => {
  if (process.env.ITUNES_LIBRARY_PATH) {
    await processiTunesLibrary()
  } else {
    await followPath(sourcePath)
    await checkCompilations(`${destPath}/Various Artists`)
  }
}

doScript()
