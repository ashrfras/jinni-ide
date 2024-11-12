let fs, fsp, path, fileURLToPath, dirname;
let PouchDB;

if (isNode()) {
    fs = await import('fs');
    fsp = await import('fs/promises');
    path = await import('path');
    fileURLToPath = await import('url').then(mod => mod.fileURLToPath);
    dirname = await import('path').then(mod => mod.dirname);
}

if (isBrowser()) {
	PouchDB = await import('./مكون.بتشدبي.mjs').then(mod => mod.بتشدبي);
}

const SRCDBNAME = 'jinni:';
const BINDBNAME = 'jinnibin:';

export class vfs {
	
	static mainFilePath;
	static projectPath;
	static outputPath;
	
	static execdir () {
		if (isNode()) {
			var __filename = fileURLToPath(import.meta.url);
			return dirname(__filename);
		} else if (isBrowser()) {
			return SRCDBNAME;
		}
	}
	static مجلدتنفيد = vfs.execdir;
	
	
	// gives the exact file name without extension
	static basename (fpath) {
		if (isNode()) {
			return path.basename(fpath, '.جني');
		} else if (isBrowser()) {
			var splitted = fpath.split('.');
			// splitted.length-1 = جني
			return splitted[splitted.length-2];
		}
	}
	static مجلدئساس = vfs.basename;
	
	
	// gives project path from given main file path
	// on browser project path is dbname:
	static getProjectPath (mainfilepath) {
		if (isNode()) {
			if (mainfilepath) {
				vfs.projectPath = path.resolve(path.dirname(mainFilePath));
			}
		} else if (isBrowser()) {
			// if browser then dbname
			vfs.projectPath = SRCDBNAME;
		}
		return vfs.projectPath;
	}
	static ردمجلدمشروع = vfs.getProjectPath;
	
	
	// gives dotted file path relative to project
	// like ئساسية.نصية.mjs
	static relativeBasePath (fpath) {
		var fileName;
		
		if (isNode()) {
			let projectPath = vfs.getProjectPath();
			fileName = fpath.replace(projectPath, '.').replace('.جني', '.mjs');
			fileName = fileName.replace(vfs.execdir(), '.');
			fileName = fileName.replaceAll('/', '.').replace('..', '/');
		} else if (isBrowser()) {
			fpath = vfs.getNoDbPath(fpath);
			fileName = fpath.replaceAll('/', '.');
			//fileName = fpath.replace('.', './');
			fileName = fileName.replace('.جني', '.mjs');
		}
		
		// make sure not to repeat last two names: ئساسية.ئساسية.جني becomes ئساسية.جني
		var nameArr = fileName.split('.');
		var lastName = nameArr[nameArr.length - 2];
		var lastLastName = nameArr[nameArr.length - 3];
		if (lastLastName) {
			if (lastName == lastLastName.replace('/', '')) {
				fileName = fileName.replace(lastName + '.', '');
			}
		}
		
		return fileName;
	}
	static ئسملفنسبي = vfs.relativeBasePath;
	
	
	// gives output (compiled bin) path from given main file path
	// on browser, output path is output dbname
	static getOutputPath (mainfilepath) {
		if (isNode()) {
			if (mainfilepath) {
				var projectPath = vfs.getProjectPath(mainfilepath);
				vfs.outputPath = path.join(projectPath, '__خام__');
			}
		} else if (isBrowser()) {
			// if browser then dbname
			vfs.outputPath = BINDBNAME;
		}
		return vfs.outputPath;
	}
	static ردمجلدخام = vfs.getOutputPath;
	
	
	// returns the full path of the compiled output file
	static outputFilePath (fileName) {
		if (isNode()) {
			return path.join(vfs.getOutputPath(), fileName);
		} else if (isBrowser()) {
			return vfs.getOutputPath() + fileName;
		}
	}
	static مسارملفخام = vfs.outputFilePath;
	
	
	static getDbName (filePath) {
		if (!filePath.includes(':')) {
			throw new Error('المسار لا يتضمن قاعدة بيانات: ' + filePath);
		}
		var splitted = filePath.split(':');
		return splitted[0];
	}
	static ردئسمقاب = vfs.getDbName;
	
	
	// get filepath without db part
	static getNoDbPath (filePath) {
		if (!filePath.includes(':')) {
			return filePath;
		} else {
			var dbName = vfs.getDbName(filePath) + ':';
			return filePath.replace(dbName, '');
		}
	}
	static مساربلاقاب = vfs.getNoDbPath;
	
	
	static joinPath (elem1, elem2) {
		if (isNode()) {
			return path.join(elem1, elem2);
		} else if (isBrowser()) {
			var str = elem1 + '/' + elem2;
			return str.replaceAll('//', '/').replaceAll(':/', ':');
		}
	}
	static ئدمجمسار = vfs.joinPath;
	
	
	// directory path of the given filepath
	static dirname (filepath) {
		if (isNode()) {
			return path.dirname(filepath);
		} else if (isBrowser()) {
			var splitted = filepath.split('/');
			splitted.pop();
			return splitted.join('/');
		}
	}
	static ئسمجلد = vfs.dirname;
	
	
	static resolve (filePath) {
		if (isNode()) {
			return path.resolve(filePath);
		} else if (isBrowser()) {
			if (!filePath.includes(':')) {
				return vfs.getProjectPath() + filePath;
			} else {
				return filePath;
			}
		}
	}
	static حلل = vfs.resolve;
	
	
	
	static async writeFile (filePath, content) {
		if (isNode()) {
			try {
				await fsp.writeFile(filePath, content, { flag: 'w+' });
			} catch (e) {
				throw new Error('فشل حفض الملف: ' + filePath);
			}
		} else if (isBrowser()) {
			var dbName = vfs.getDbName(filePath);
			var myDb = new PouchDB(dbName);
			myDb = myDb['بتش'];
			filePath = vfs.getNoDbPath(filePath);
			// get file if already exist
			var myFile;
			filePath = filePath.replace('.جني', '.mjs');
			try {
				myFile = await myDb.get(filePath);
				myFile.content = content;
			} catch (e) {
				myFile = {
					_id: filePath,
					content
				};
			}
			try {
				await myDb.put(myFile);
			} catch (e) {
				console.log('فشلت الكتابة في: ' + dbName + ':' + filePath);
			}
		}
	}
	static ئكتبملف = vfs.writeFile;
	
	
	
	static async readFile (filePath) {
		if (isNode()) {
			try {
				return await fsp.readFile(filePath, 'utf8');
			} catch (e) {
				return false;
			}
		} else if (isBrowser()) {
			var dbName = vfs.getDbName(filePath);
			var myDb = new PouchDB(dbName);
			myDb = myDb['بتش'];
			filePath = vfs.getNoDbPath(filePath);
			var myDoc;
			try {
				myDoc = await myDb.get(filePath);
			} catch (e) {
				console.log('تعدرت قرائة الملف: ' + dbName + ':' + filePath);
				console.log(e);
			}
			if (myDoc) {
				if (filePath.endsWith('.جني')) {
					var result = await myDb.find({
						selector: {
							نوع: 'بطاقة',
							وحدة: filePath
						},
						limit: 3000
					});
					var cards = result.docs;
					cards.sort((a, b) => a.رتبة - b.رتبة);
					
					var results = cards.map((card) => card.محتوا);
					var result = results.join('\n');
					return result;
				} else {
					return myDoc.content;
				}
			} else {
				return false;
			}
		}
	}
	static ئقرئملف = vfs.readFile;
	
	
	// removes dir/db at given path and/to recreate empty one
	static async remakeDir (dirPath) {
		if (isNode()) {
			try {
				await fsp.rm(dirPath, { recursive: true });
			} catch (err) {
			} finally {
				fs.mkdirSync(dirPath);
			}
		} else if (isBrowser()) {
			var dbName = vfs.getDbName(dirPath);
			var myDb = new PouchDB(dbName);
			myDb = myDb['بتش'];
			await myDb.destroy();
			new PouchDB(dbName);
		}
	}
	static ئعدئنشائ = vfs.remakeDir;

	
	
	static async fileExist (filePath) {
		if (isNode()) {
			try {
				await fsp.access(filePath);
				return true;
			} catch (err) {
				return false;
			}
		} else if (isBrowser()) {
			// we'll search in jinni db if module exist
			var dbName = vfs.getDbName(filePath);
			var myDb = new PouchDB(dbName);
			myDb = myDb['بتش'];
			var nodbPath = vfs.getNoDbPath(filePath);
			try {
				await myDb.get(nodbPath);
				return true;
			} catch (err) {
				return false;
			}
		}
	}
	static ملفموجود = vfs.fileExist;
	
	
	
	static async copyFile (srcPath, dstPath) {
		if (isNode()) {
			await fsp.copyFile(srcPath, dstPath);
		} else if (isBrowser()) {
			var srcDb = vfs.getDbName(srcPath);
			var dstDb = vfs.getDbName(dstPath);
			var mySrcDb = new PouchDB(srcDb);
			mySrcDb = mySrcDb['بتش'];
			var myDstDb = new PouchDB(dstDb);
			myDstDb = myDstDb['بتش'];
			
			srcPath = vfs.getNoDbPath(srcPath);
			dstPath = vfs.getNoDbPath(dstPath);
			
			var mySrcDoc, myDstDoc;
			
			try {
				mySrcDoc = await mySrcDb.get(srcPath);
			} catch (e) {
				console.log('تعدرت قرائة الملف: ' + srcDb + ':' + srcPath);
				console.log(e);
			}
			
			var record = {
				_id: dstPath,
				content: mySrcDoc.content,
			};
			
			try {
				myDstDoc = await myDstDb.get(dstPath);
				record._rev = myDstDoc._rev;
			} catch (e) {}
			
			try {
				await myDstDb.put(record);
			} catch (e) {
				console.log('فشلت الكتابة في: ' + dstDb + ':' + dstPath);
				console.log(e);
			}
		}
	}
	static ئنسخملف = vfs.copyFile;
}

function isNode() {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

function isBrowser() {
    return typeof window !== 'undefined';
}

export default vfs;