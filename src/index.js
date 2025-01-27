const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const fetch = require('node-fetch'); // Using CommonJS

const isMac = process.platform === 'darwin'
let galleryViewInterval // Declare galleryViewInterval globally
const template = [
    // { role: 'appMenu' }
    ...(isMac
        ? [
            {
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' },
                ],
            },
        ]
        : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    // { role: 'editMenu' }
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            ...(isMac
                ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' },
                        ],
                    },
                ]
                : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' },
                ]),
        ],
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            { label: 'Gallery View', click: () => toggleGalleryView() },
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
        ],
    },
    // { role: 'windowMenu' }
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac
                ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' },
                ]
                : [{ role: 'close' }]),
        ],
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Dot Website',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://dotapp.uk/')
                },
            },
        ],
    },
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

let mainWindow
let pythonProcess // Declare pythonProcess globally

// FIND PYTHON VENV, WORKS IN DEVELOPMENT MODE AND **SHOULD** WORK IN PACKAGED APP

function findPython() {
    const possibilities = [
        // In packaged app
        path.join(process.resourcesPath, 'llm', 'python', 'bin', 'python3'),
        //WINDOWS: path.join(process.resourcesPath, 'llm', 'python', 'python.exe'),

        // In development
        path.join(__dirname, '..', 'llm', 'python', 'bin', 'python3'),
        //WINDOWS: path.join(process.__dirname, 'llm', 'python', 'python.exe'),
    ]
    for (const path_to_python of possibilities) {
        if (fs.existsSync(path_to_python)) {
            return path_to_python
        }
    }
    console.log('Could not find python3, checked', possibilities)
    //app.quit()
}

const pythonPath = findPython()
console.log('Python Path:', pythonPath)
// main
ipcMain.on('show-context-menu', (event) => {
    const template = [
        {
            label: 'Menu Item 1',
            click: () => {
                event.sender.send('context-menu-command', 'menu-item-1')
            },
        },
        { type: 'separator' },
        { label: 'Menu Item 2', type: 'checkbox', checked: true },
    ]
    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
})
// RUNS DOT THROUGHT  script.py

//let currentScript = path.join(__dirname, '..', 'llm', 'scripts', 'docdot.py')

let currentScript = path.join(
    process.resourcesPath,
    'llm',
    'scripts',
    'docdot.py'
)
// Default script 

ipcMain.on('run-python-script', (event, { userInput, buttonClicked }) => {
    // Check if the Python process is already running
    if (pythonProcess) {
        // Send the new input to the existing process
        pythonProcess.stdin.write(`${userInput} ${buttonClicked}\n`)
    } else {
        // If the Python process is not running, spawn a new one with the default script
        console.log(`Current working directory: ${process.cwd()}`)
        pythonProcess = spawn(pythonPath, [currentScript], { shell: true })

        pythonProcess.stdout.on('data', (data) => {
            const message = data.toString().trim()
            mainWindow.webContents.send('python-reply', message)
            console.log(`stdout: ${data}`)
        })

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Script Error: ${data}`)
            console.error(`stderr: ${data}`)
        })

        // Send the initial input to the new process
        pythonProcess.stdin.write(`${userInput} ${buttonClicked}\n`)
    }
})

//BIG DOT TOGGLE!!!!

// Switch between the two scripts
ipcMain.on('switch-script', (event, selectedScript) => {
    // Toggle between 'script.py' and 'normalchat.py'
    console.log('Switching script to:', selectedScript)

    currentScript = currentScript.endsWith('docdot.py')
        ? path.join(process.resourcesPath, 'llm', 'scripts', 'bigdot.py')
        : path.join(process.resourcesPath, 'llm', 'scripts', 'docdot.py');
    /*currentScript = currentScript.endsWith('docdot.py')
    ? path.join(__dirname, '..', 'llm', 'scripts', 'bigdot.py')
    : path.join(__dirname, '..', 'llm', 'scripts', 'docdot.py');*/

    // If the Python process is running, kill it and spawn a new one with the updated script
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = spawn(pythonPath, [currentScript], { shell: true });

        pythonProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            mainWindow.webContents.send('python-reply', message);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Script Error: ${data}`);
        });
    }

    // Optionally, you can inform the renderer process about the script switch
    mainWindow.webContents.send('script-switched', currentScript);
});

//OPEN FOLDER THING!!!!

// Define a path for the file where you will store the last opened directory
const userDataPath = app.getPath('userData');
const lastOpenedDirPath = path.join(userDataPath, 'lastOpenedDir.txt');

ipcMain.on('get-user-data-path', (event) => {
    event.returnValue = app.getPath('userData');
});

ipcMain.handle('open-dialog', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Directory',
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const chosenDirectory = result.filePaths[0];
        console.log('Chosen Directory:', chosenDirectory);

        // Save the chosen directory to the file
        fs.writeFileSync(lastOpenedDirPath, chosenDirectory, 'utf8');
    } else {
        console.log('No directory selected.');
    }
    return result;
});

// ELECTRON STUFF, CREATE THE WINDOW BLA BLA !!!!


// Flag to track whether dark mode is enabled or not
let isDarkModeEnabled = false;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1250,
        height: 700,
        minWidth: 1250,
        minHeight: 700,
        //autoHideMenuBar: true, // FOR WINDOWS
        titleBarStyle: 'hidden', // REMOVE FOR WINDOWS
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            icon: path.join(__dirname, 'Assets', 'icon.ico'), // Provide the correct path
        },
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'))
    // Listen for 'toggle-dark-mode' message from renderer process
    ipcMain.on('toggle-dark-mode', (event) => {
        // Toggle the dark mode flag
        isDarkModeEnabled = !isDarkModeEnabled;
        // Send message back to renderer process with the new state
        event.sender.send('dark-mode-toggled', isDarkModeEnabled);
    });

    //mainWindow.webContents.openDevTools();
}

// GALLERY VIEW!!!!

function toggleGalleryView() {
    if (!galleryViewInterval) {
        // Start the image rotation
        galleryViewInterval = setInterval(() => {
            const imagePath = getRandomImage()
            mainWindow.webContents.send('update-background', imagePath)
        }, 60000) // Change image every 20 seconds

        // Send the first image immediately
        const firstImagePath = getRandomImage()
        mainWindow.webContents.send('update-background', firstImagePath)
    } else {
        // Stop the image rotation
        clearInterval(galleryViewInterval)
        galleryViewInterval = null
    }
}

function getRandomImage() {
    const imagesFolder = path.join(__dirname, 'Assets', 'wallpapers')
    const imageFiles = fs.readdirSync(imagesFolder)
    const randomIndex = Math.floor(Math.random() * imageFiles.length)
    return path.join(imagesFolder, imageFiles[randomIndex])
}


ipcMain.on('show-context-menu', (event) => {
    const template = [
        {
            label: 'Menu Item 1',
            click: () => {
                event.sender.send('context-menu-command', 'menu-item-1')
            },
        },
        { type: 'separator' },
        { label: 'Menu Item 2', type: 'checkbox', checked: true },
    ]
    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
})

ipcMain.on('toggle-gallery-view', () => {
    toggleGalleryView()
})

ipcMain.on('update-background', (event, imagePath) => {
    mainWindow.webContents.send('update-background', imagePath)

    // MOAR ELECTRON STUFF!!!! TINKER AT RISK LMAO

    const pythonPath = findPython()
    console.log('Python Path:', pythonPath)

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        // Do not quit the app when all windows are closed on platforms other than macOS
        // app.quit();
    }
})


const appPath = app.getAppPath()

ipcMain.handle('execute-python-script', async (event, directory) => {
    try {
        // Construct paths relative to the script's location

        const pythonScriptPath = path.join(
            process.resourcesPath,
            'llm',
            'scripts',
            'embeddings.py'
        )
        /*const pythonScriptPath = path.join(
            __dirname,
            '..',
            'llm',
            'scripts',
            'embeddings.py'
        )*/

        // Quote the directory path to handle spaces
        const quotedDirectory = `"${directory}"`
        // Spawn the Python process
        const pythonProcess = spawn(
            pythonPath,
            [pythonScriptPath, quotedDirectory],
            { shell: true }
        )

        // Handle the output and errors if needed
        pythonProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`)
        })

        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`)
        })

        // Wait for the Python process to exit
        await new Promise((resolve) => {
            pythonProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`)
                resolve()
            })
        })
    } catch (err) {
        console.error(err)
    }
})

// DOWNLOAD MISTRAL AND SUCH!

console.log("IPC Setup Starting");
ipcMain.on('start-download', (event, data) => {
    console.log("IPC Message Received:", data);
    ensureAndDownloadDependencies(event.sender)
        .catch(error => {
            console.error('Download Initiation Failed:', error);
            event.sender.send('download-error', error.toString());
        });
});



// Function to get the Dot-data directory path
function getDotDataPath() {
    const documentsPath = app.getPath('documents');
    return path.join(documentsPath, 'Dot-Data');
}

// Function to check if the required file exists
function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

// Function to download files

async function downloadFile(url, outputPath, event) {
    try {
        //const fetch = (await import('node-fetch')).default; // Using dynamic import

        const response = await fetch(url);

        // Check if the response is ok (status 200)
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const fileStream = fs.createWriteStream(outputPath);

        // Total bytes received and the content length (if available)
        const totalBytes = parseInt(response.headers.get('content-length'), 10);
        let receivedBytes = 0;

        // Handle data events and pipe to file stream
        response.body.on('data', (chunk) => {
            receivedBytes += chunk.length;
            const progress = totalBytes ? Math.round((receivedBytes / totalBytes) * 100) : 0;
            if (event && event.sender) {
                event.sender.send('download-progress', progress);
            }
        });

        // Pipe the response body directly to the file stream
        response.body.pipe(fileStream);

        return new Promise((resolve, reject) => {
            fileStream.on('finish', () => {
                resolve();
            });

            // Handle file and response stream errors
            fileStream.on('error', (err) => {
                fileStream.close();
                fs.unlink(outputPath, () => { }); // Attempt to delete the file
                reject(err);
            });

            response.body.on('error', (err) => {
                fileStream.close();
                fs.unlink(outputPath, () => { }); // Attempt to delete the file
                reject(err);
            });
        });
    } catch (error) {
        console.error('Download error:', error.message);
        if (event && event.sender) {
            event.sender.send('download-error', error.message);
        }
        throw error;
    }
}


// Ensure directory exists and download dependencies if necessary
async function ensureAndDownloadDependencies(event) {
    const dotDataDir = getDotDataPath();
    if (!fs.existsSync(dotDataDir)) {
        fs.mkdirSync(dotDataDir, { recursive: true });
    }

    const filePath = path.join(dotDataDir, 'mistral-7b-instruct-v0.2.Q4_K_M.gguf');
    if (!checkFileExists(filePath)) {
        try {
            await downloadFile('https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf?download=true', filePath, event);
            console.log('Download completed');
        } catch (error) {
            console.error('Download failed:', error);
            if (event) {
                event.sender.send('download-error', error.message);
            }
        }
    } else {
        console.log('File already exists, no download needed.');
    }
}


app.on('ready', () => {
    const mainWindow = createWindow(); // This should now correctly create and return the window

    if (mainWindow) {
        mainWindow.on('ready-to-show', () => {
            ensureAndDownloadDependencies(mainWindow.webContents)
                .catch(error => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('download-error', error.message);
                    }
                });
        });
    } else {
        console.error('Failed to create main window');
    }
});

// IPC event handler
ipcMain.on('start-download', (event, { url, outputPath }) => {
    if (event.sender && !event.sender.isDestroyed()) {
        ensureAndDownloadDependencies(event)
            .catch(error => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('download-error', error.message);
                }
            });
    }
});
