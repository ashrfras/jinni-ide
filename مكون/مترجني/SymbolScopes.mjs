import ErrorManager from './ErrorManager.mjs';
import Symbol from './Symbol.mjs';
import Scope from './Scope.mjs'

export class SymbolScopes {
	scopeStack; // as Scope
	
	// this takes a fileName, an returns an autoimport code to add to it
	static autoImportText(fileName) {
		if (!fileName.includes('ئساسية')) { //!Symbol.isAutoImport(fileName)) {
			return "ئورد " + Symbol.AUTOIMPORTS.join('، ') + '؛';
		} else {
			return "";
		}
	}
	
	constructor () {
		this.scopeStack = [];
		this.enter(); // first scope
	}

	enter () {
		return this.scopeStack.push(new Scope());
	}
	
	exit () {
		return this.scopeStack.pop();
	}
	
	exitAndClear () {
		var sc = this.scopeStack.pop();
		sc.clear();
		return sc;
	}
	
	getCurrent () {
		return this.scopeStack[this.scopeStack.length - 1];
	}
	
	// create a symbol without declaring it
	// or scope checking it
	// use this to create a symbol, never use new Symbol by your own
	createSymbol (name, type, isArray = false, subType = null) {
		var mySymb = new Symbol(name);
		if (!type) {
			type = name;
		}
		if (subType) {
			mySymb.subTypeSymbol = this.getSymbByName(subType);
		}
		if (type == 'فارغ') {
			mySymb.typeSymbol = Symbol.SYSTEMTYPES['فارغ']
		}else if (name != type) {
			// this is a variable
			// check it's type symbol
			var smb = this.getSymbByName(type);
			if (!smb.isClass && !smb.isStruct && !smb.isComposite && !smb.isSystem() && !smb.isEnum) {
				ErrorManager.error("الئسم " + type + " ليس نوعا");
			}
			// type symbol is an enum
			if (smb.isEnum) {
				mySymb.typeSymbol = this.getSymbByName('نوعتعداد');
				mySymb.isEnum = true;
				mySymb.isArray = false;
				mySymb.allowed = smb.allowed;
			} else {
				// normal variables reference there type's members
				// while composite variables copy there type's member
				if (type == 'نوعمركب') {
					smb.members.forEach(m => {
						mySymb.members.push(m);
					});
				} else {
					mySymb.members = smb.members;
				}
				mySymb.typeSymbol = smb;
				mySymb.isArray = isArray;
			}
		}
		return mySymb;
	}
	
	// like createSymbol() above but takes symbol arguments not type names
	createSymbolS (name, typeSymbol, isArray, subTypeSymbol = null) {
		var mySymb = new Symbol(name);
		mySymb.subTypeSymbol = subTypeSymbol;
		
		if (!typeSymbol.isClass && !typeSymbol.isStruct && !smb.isComposite && !smb.isSystem()) {
			ErrorManager.error("الئسم " + typeSymbol.name + " ليس نوعا");
		}
		
		mySymb.members = typeSymbol.members;
		mySymb.isArray = isArray;
		mySymb.typeSymbol = typeSymbol;
		return mySymb;
	}
	
	declareSymbol (name, type, isArray = false, subType = null) {
		// declare symb in the current scope
		var scope = this.getCurrent();
		if (scope.containsByName(name)) {
			ErrorManager.error("الئسم '" + name + "' معرف مسبقا في هدا المجال");
		}
		if (!type) {
			type = name;
		}
		var mySymb = this.createSymbol(name, type, isArray, subType);
		scope.add(mySymb);
		return mySymb;
	}
	
	declareSymbolS (smb) {
		var scope = this.getCurrent();
		if (scope.containsByName(smb.name)) {
			ErrorManager.error("الئسم '" + name + "' معرف مسبقا في هدا المجال");
		}
		return scope.add(smb);
	}
	
	declareCompositeSymbol (header, haslist, id) {
		var asymb, symb;
		if (header.isArray) {
			symb = this.declareSymbol(id, 'مصفوفة', true, 'نوعمركب');
			// for arrays of composites, subTypeSymbol is a duplicate form نوعمركب
			symb.subTypeSymbol = symb.subTypeSymbol.duplicate();
			symb.subTypeSymbol.members = []; // reinit members
			symb.subTypeSymbol.isComposite = true;
			asymb = symb;
			symb = symb.subTypeSymbol;
		} else { // not array
			symb = this.declareSymbol(id, 'نوعمركب');
			symb.isComposite = true; // bad but legacy
		}
		
		if (haslist) {
			haslist.forEach((s) => {
				if (s.isSpread) {
					// is a spread ... in the composite, then it's marked with this
					symb.hasUnknownComposite = true;
				} else {
					symb.addMember(s.symb);
				}
			});
		} else {
			symb.hasUnknownComposite = true;
		}
		
		return asymb ? asymb : symb;
	}
	
	makeCompositeSymbol (symb, isArray, haslist) {
		var mySymb;
		if (isArray) {
			var compSymb = this.getSymbByName('نوعمركب');
			symb.isArray = true;
			symb.typeSymbol = this.getSymbByName('مصفوفة');
			symb.subTypeSymbol = compSymb.duplicate();
			symb.subTypeSymbol.members = []; // reinit members
			symb.subTypeSymbol.isComposite = true;
			mySymb = symb.subTypeSymbol;
		} else {
			symb.isComposite = true;
			mySymb = symb;
		}
		if (haslist) {
			haslist.forEach((s) => {
				if (s.isSpread) {
					// is a spread ... in the composite, then it's marked with this
					mySymb.hasUnknownComposite = true;
				} else {
					mySymb.addMember(s.symb);
				}
			});
		} else {
			mySymb.hasUnknownComposite = true;
		}
	}
	
	// Adds a symbol to the current scope
	addSymbol (smb) {
		var scope = this.getCurrent();
		if (scope.containsByName(smb.name)) {
			ErrorManager.error("الئسم '" + smb.name + "' معرف مسبقا في هدا المجال");
		}
		return scope.add(smb);
	}
	
	checkSymb (symb) {
		// check symb in the current scope and it's parents
		return checkByName(symb.name);
	}
	
	getSymbByName (symbName) {
		// check symb in the current scope and it's parent given it's name
		if (Symbol.isSystemType(symbName)) {
			return Symbol.getSystemType(symbName);
		}
		for (var i=this.scopeStack.length-1; i >= 0; i--) {
			var scope = this.scopeStack[i];
			var mySymb = scope.containsByName(symbName);
			if (mySymb) {
				return mySymb;
			}
		}
		ErrorManager.error("الئسم '" + symbName + "' غير معروف");
	}
	
	
}

export default SymbolScopes;