import { BrowserWindow, app } from "electron";
import path from "path";
//#region electron/main.ts
var mainWindow;
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
//#endregion
export {};
