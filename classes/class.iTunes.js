const FS = require("fs").promises;
const PList = require("plist");
const Path = require("path");
const Base = require("./class.base");

module.exports = class iTunesLibrary extends Base {
  constructor(sourcePath, destPath) {
    super();

    this.trackMap = [];
    this.sourcePath = sourcePath;
    this.destPath = destPath;
  }

  async updateTrackLocations(tracks) {
    for (const track of tracks) {
      track.Location = track.Location.replace(
        process.env.ITUNES_LIBRARY_OLD_MEDIA_PATH,
        this.sourcePath
      );
    }
  }

  async processTrackSegments(playlists, tracks) {
    const playlist = playlists.find(
      (playlist) =>
        playlist.Name === process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST
    );
    if (!playlist) {
      return {
        All: tracks,
      };
    }
    const segmentedFolder =
      process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST_FOLDER ||
      process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST;
    const unsegmentedFolder =
      process.env.ITUNES_LIBRARY_UNSEGMENTED_FOLDER || "Other";
    const segmentedTracks = {
      [segmentedFolder]: [],
      [unsegmentedFolder]: [],
    };
    const playlistTracks = playlist["Playlist Items"].map(
      (item) => item["Track ID"]
    );

    for (const track of tracks) {
      if (
        playlistTracks.some(
          (playlistTrackID) => playlistTrackID === track["Track ID"]
        )
      ) {
        segmentedTracks[segmentedFolder].push(track);
      } else {
        segmentedTracks[unsegmentedFolder].push(track);
      }
    }

    return segmentedTracks;
  }

  async processiTunesLibrary() {
    const iTunesLibraryFileData = await FS.readFile(
      process.env.ITUNES_LIBRARY_PATH
    );
    const iTunesLibraryData = PList.parse(iTunesLibraryFileData.toString());
    let tracks = Object.values(iTunesLibraryData.Tracks).filter(
      (track) => track.Location
    );
    if (process.env.ITUNES_LIBRARY_OLD_MEDIA_PATH) {
      await this.updateTrackLocations(tracks);
    }
    if (process.env.ITUNES_LIBRARY_SEGMENT_PLAYLIST) {
      tracks = await this.processTrackSegments(
        iTunesLibraryData.Playlists,
        tracks
      );
    } else {
      tracks = {
        All: tracks,
      };
    }

    return tracks;
  }

  async buildTrackMap() {
    const tracks = await this.processiTunesLibrary();

    for (const parentFolder in tracks) {
      const folderTracks = tracks[parentFolder];
      for (const track of folderTracks) {
        const fileInfo = await Path.parse(
          track.Location.replace("file://", "")
        );

        this.trackMap.push({
          artist: track.Artist,
          originalArtist: track.Artist,
          album: track.Album,
          title: track.Name,
          trackNo: track["Track Number"],
          ext: fileInfo.ext,
          createdTime: track["Date Added"],
          modifiedTime: track["Date Modified"],
          compilation: track.Compilation,
          parentFolder,
          path: decodeURI(track.Location.replace("file://", "")),
        });
      }
    }
  }
};
