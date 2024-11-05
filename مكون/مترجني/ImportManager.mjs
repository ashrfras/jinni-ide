import vfs from './vfs.mjs';
import ErrorManager from './ErrorManager.mjs';
import Scope from './Scope.mjs';
import Symbol from './Symbol.mjs';
import { createParser } from './jparser.mjs';

export class ImportManager {
	static importedScopes = [];
	static openScopes = []; // currently open files
	static toReparse = []; // files with circular dependancy to reparse
	
	static dependencies = []; //third party dependencies specified by يعتمد
	
	static projectPath;
	static outputPath;
	
	static setContext (ctx) {
		ImportManager.projectPath = ctx.projectPath;
		ImportManager.outputPath = ctx.outPath;
	}
	
	static async addStringImport (imp, fromFilePath) {
		if (imp.startsWith('//')) {
			// nothing to do here, but import is correct
		} else if (imp.startsWith('/')) {
			// this is a local file, copy it to the project out
			var sourcePath = vfs.joinPath(vfs.dirname(fromFilePath), imp);
			var fileExist = await vfs.fileExist(sourcePath);
			if (!sourcePath) {
				ErrorManager.error("ملف الئيراد غير موجود: " + imp);
			}
			
			var destination = vfs.joinPath(ImportManager.outputPath, imp);
			await vfs.copyFile(sourcePath, destination);
		} else {
			// also nothing to do here, this is not an error anymore
			// I'm keeping these if else for clarity reasons
			//ErrorManager.error("تبدئ الئيرادات النصية ب // ئو /");
		}
	}
	
	// imp is import path
	// fromFilePath is path of file from which import occuring
	static async addImport (imp, fromFilePath, findName = null) {
		// validate findName
		if (findName && findName.includes('.')) {
			ErrorManager.error(findName + " ليس ئسم ئيراد صالح");
			return;
		}
		// check if currently open => circular dependancy
		// don't parse an already open file
		// just return the symbol as منوع
		// and show warning message
		
		// is this an automatically imported file?
		var impname = imp.split('.');
		impname = impname[impname.length-1];
		// import info
		var info = await ImportManager.getImportInfo(imp);
		imp = info.importName || imp;
		
		var isAutoImport = imp == 'ئساسية.بدائي' || (imp.includes('ئساسية') && Symbol.AUTOIMPORTS.includes(impname));
		var openScope = ImportManager.openScopes.find((s) => s.name == imp);
		if (openScope) {
			ErrorManager.warning("ئيراد دائري ل '" + imp + "' من '" + fromFilePath + "'");
			var impname = imp.split('.');
			impname = impname[impname.length-1];
			var scope = new Scope();
			scope.add(new Symbol(impname, Symbol.getSystemType('منوع')));
			var myImp = '/' + imp.replaceAll('.', '/') + '.جني';
			ImportManager.toReparse.push({
				whenEnd: myImp,
				reparse: fromFilePath,
				name: imp
			});
			if (!isAutoImport) {
				ImportManager.openScopes.pop();
			}
			scope.importName = '/' + info.importName + '.mjs';
			return scope;
		}
		
		// check if already imported
		var importedScope = ImportManager.importedScopes.find((s) => s.name == imp);
		if (importedScope) {
			//!isAutoImport && ImportManager.openScopes.pop();
			return importedScope.scope;
		}
		
		if (ImportManager.isUrlImport(imp)) {
			// remove " and '
			imp = imp.replace(/\"/g, '').replace(/\'/g, '');
			if (!imp.startsWith('//')) {
				// string import should start with '//' 
				ErrorManager.warning("ئيراد عنونت لا يبدئ ب //");
			}
			// string imports are not added to importedScopes
			// since no symbols are declared
			
		} else {
			// register this a open scope
			// but only if not in auto imports, those don't cause circular dependancy conflicts
			
			if (!isAutoImport) {
				ImportManager.openScopes.push({
					name: imp
				});
			}
		
			// this is not a string, this is not a URL import
			var myFileImp = await ImportManager.getImportInfo(imp, findName);
			if (myFileImp.exists) {
				if (myFileImp.path == fromFilePath) {
					ErrorManager.warning('تم تجاهل ئيراد لنفس الملف الحالي');
					var myScope;
					if (!isAutoImport) {
						myScope = ImportManager.openScopes.pop();
					} else {
						myScope = ImportManager.openScopes[ImportManager.openScopes.length-1];
					}
					return myScope;
				}
				var scope = {
					name: imp,
					scope: await ImportManager.processImport(myFileImp.path, fromFilePath)
				}
				//scope.scope.importName = myFileImp.importName;
				// don't add this file to importedScopes if marked to reparse
				// bc files with circular dependancy are to be reparsed again
				//var toreparse = ImportManager.toReparse.find((elem => elem.reparse == fromFilePath));
				ImportManager.importedScopes.push(scope);
				
				if (!isAutoImport) {
					ImportManager.openScopes.pop(); // remove this file from currently open imports list
				}
				
				// if reparsewhen this means this file has caused circular depandency
				// we need to reparse the other dependant file
				
				var reparseWhen = ImportManager.toReparse.find((elem => fromFilePath.includes(elem.whenEnd)));
				if (reparseWhen) {
					ImportManager.toReparse = ImportManager.toReparse.filter((elem => fromFilePath.includes(elem.reparse)));				
					var myimp = reparseWhen.reparse.replaceAll('/', '.').replaceAll('.جني', '');
					var reparseScope = ImportManager.importedScopes.find(elem => myimp.includes(elem.name));
					var myFileImp = await ImportManager.getImportInfo(reparseScope.name);
					reparseScope.scope = await ImportManager.processImport(myFileImp.path, fromFilePath);
				}
				
				return scope.scope;
			} else {
				// import is not found locally, search and download from library
				// and then continue just like local like: مكون.بتشدبي
				// TODO: downloadFromLibrary();
				myFileImp = await ImportManager.getImportInfo(`مكون.${imp}`);
				if (myFileImp.exists) {
					// we have successfully downloaded component from library
					var scope = {
						name: imp,
						scope: await ImportManager.processImport(myFileImp.path, fromFilePath)
					}
					//scope.scope.importName = myFileImp.importName;
					if (! ImportManager.toReparse.includes(fromFilePath)) {
						ImportManager.importedScopes.push(scope);
					}
					
					if (!isAutoImport) {
						ImportManager.openScopes.pop();
					}
					return scope.scope;
				} else {
					if (!isAutoImport) {
						ImportManager.openScopes.pop();
					}
					ErrorManager.error("تعدر ئيجاد الوحدة '" +  imp + "'");
				}
			}
		}
	}
	
	static async getImportInfo (impPath, findName = null) {	
		// imports can be relative to project path to current file
		// if not, they are relative to the compiler executable
		var projectBase = ImportManager.projectPath;
		var compilerBase = vfs.execdir();

		// look in the current project path
		var ret = await ImportManager._getImportInfo(impPath, projectBase, findName);
		if (!ret.exists) {
			// look in the compiler exec path
			ret = await ImportManager._getImportInfo(impPath, compilerBase, findName);
		}
		
		return ret;
	}
	
	static async _getImportInfo (impPath, basePath, findName = null) {		
		var splitted = impPath.split('.');
		var name = splitted[splitted.length-1]; // last part is filename
		// ئساسية.عنصر becomes ئساسية/عنصر
		var myImport = impPath.replaceAll('.', '/');

		// try to find like /projectPath/مستورد.جني
		var filePath1 = vfs.joinPath(basePath, myImport + '.جني');
		// or find like /projectPath/مستورد/مستورد.جني
		var filePath2 = vfs.joinPath(basePath, myImport);
		filePath2 = vfs.joinPath(filePath2, name + '.جني');
		// or find like /projectPath/ئساسية/مستورد.جني
		var filePath3 = vfs.joinPath(basePath, 'ئساسية');
		filePath3 = vfs.joinPath(filePath3, name + '.جني');

		// or if findName find like /projectPath/ئساسية/جيزن.جني
		var filePath4 = null;
		if (findName) {
			filePath4 = vfs.joinPath(basePath, myImport);
			filePath4 = vfs.joinPath(filePath4, findName + '.جني');
		}
		
		var exist = await vfs.fileExist(filePath1);
		if (exist) {
			return {
				exists: true,
				path: filePath1,
				relativePath: '.' + filePath1.replace(basePath, ''),
				importName: impPath
			}
		}
		
		exist = await vfs.fileExist(filePath2);
		if (exist) {
			return {
				exists: true,
				path: filePath2,
				relativePath: '.' + filePath2.replace(basePath, ''),
				importName: impPath + '.' + name
			}
		}
		
		exist = await vfs.fileExist(filePath3);
		if (exist) {
			return {
				exists: true,
				path: filePath3,
				relativePath: '.' + filePath3.replace(basePath, ''),
				importName: 'ئساسية.' + name
			}
		}
		
		if (filePath4) {
			exist = await vfs.fileExist(filePath4);
			if (exist) {
				return {
					exists: true,
					path: filePath4,
					relativePath: '.' + filePath4.replace(basePath, ''),
					importName: impPath + '.' + findName
				}
			}
		}

		return {
			exists: false
		}
	}
	
	static async processImport(importPath, fromFilePath) {
		//var fileBase = Path.dirname(fromFilePath);
		//var importPath = Path.join(ImportManager.projectPath, relativeImportPath);
		
		var scope = await ImportManager.readAndParseFile(importPath);
		if (!scope) {
			ErrorManager.printAll(); // this exits process
		}
		return scope;
	}
	
	// read and parse an imported file
	static async readAndParseFile(filePath) {
		filePath = vfs.resolve(filePath);
		var fileContent = await vfs.readFile(filePath);
		if (!fileContent) {
			ErrorManager.error("تعدر ئيراد الوحدة: " + filePath);
		}
		
		const parser = createParser();
		
		try {
			const scope = await parser.parse(fileContent, {
				filePath: filePath,
				projectPath: ImportManager.projectPath,
				outPath: ImportManager.outputPath
			});
			// returns a scope object containing global symbols of
			// the imported files
			return scope;
		} catch (e) {
			// parsing failed
			console.log(e);
			ErrorManager.printAll();
		}
	}
	
	static isUrlImport (s) {
		return s.startsWith('"') || s.startsWith("'");
	}
	
}

//module.exports = ImportManager;
export default ImportManager;