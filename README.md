# Organize Your Music Folder

This is a simple script that will take your music folder and organize it based on music metadata.

## Warning!

Before executing this script, make sure to back up your existing folder!

## How to use

1. Copy .env.example to .env and change the source and destination variables to match your environment.
2. Run `npm install`
3. Run `node index.js`

## iTunes Support

Support has been added to handle older iTunes XML library files. This is entirely optional, as just pointing to the folder will get you most things as it is, except for possibly the exact date the file was added to your library.

Here's a list of iTunes-related .env variables. Feel free to remove them from your .env to just sync the folders.

- `ITUNES_LIBRARY_PATH` - The path to the iTunes XML file
- `ITUNES_LIBRARY_OLD_MEDIA_PATH` - The folder in which the XML file says the library exists. Do not include the file:// bit
- `ITUNES_LIBRARY_SEGMENT_PLAYLIST` - The name of a playlist whose tracks you want to segment by (ie, Favorites)
- `ITUNES_LIBRARY_SEGMENT_PLAYLIST_FOLDER` - Where to put tracks in the playlist
- `ITUNES_LIBRARY_UNSEGMENTED_FOLDER` - Where to put tracks not in the playlist
