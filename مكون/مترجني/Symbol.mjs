import ErrorManager from './ErrorManager.mjs';

export class Symbol {
	// Automatically import these types in every source
	static AUTOIMPORTS = ['عدد', 'منطق', 'مصفوفة', 'نصية', 'نوعبنية', 'نوعمركب', 'نوعتعداد', 'تاريخ'];
	
	// system types known by the compiler
	static SYSTEMTYPES = {
		'مجهول': new Symbol('مجهول'),
		'فارغ': new Symbol('فارغ'),
		'منوع': new Symbol('منوع'),
		'عدم': new Symbol('عدم'),
		'دالة': new Symbol('دالة')
	};
	
	// generic permissive types
	static GENERICTYPES = {
		'مجهول': Symbol.SYSTEMTYPES['مجهول'],
		'منوع': Symbol.SYSTEMTYPES['منوع'],
		'عدم': Symbol.SYSTEMTYPES['عدم']
	}
	
	name;
	typeSymbol;
	subTypeSymbol; // type of arrays	
	isClass; // bad but legacy
	isStruct; // bad but legacy
	isComposite; // bad but legacy
	isEnum; // bad but legacy
	mySuper; // if this is an inheriting class
	myShortcut; // if this is a shortcut symbol
	isAwait; // if function contains await
	isArray; // is this an array
	superSymbol; // symbol of super class if this class inherits
	members = [];
	args = []; // func argument symbols
	allowed = []; // allowed values for enums
	isLiteral = false; // is this a literal value
	isImport = false; // is this an import symbol
	isReadOnly = false;
	memberOf = null; // this symb is a member of another symb?
	hasUnknownComposite = false; // a composite with ... is marked with this as true
	isHeader = false; // is this a header declaration symbol
	
	
	constructor (name, typeSymbol = null, isArray = false, isClass = false) {
		this.name = name;
		this.typeSymbol = typeSymbol || this;
		//this.members = [];
		this.isClass = isClass;
		this.mySuper = '';
		this.myShortcut = '';
		this.isArray = isArray;
	}
	
	static isSystemType(symbName) {
		return Boolean(Symbol.SYSTEMTYPES[symbName]);
	}
	
	static isGenericType(symbName) {
		return Boolean(Symbol.GENERICTYPES[symbName]);
	}
	
	static isAutoImport(symbName) {
		return Boolean(Symbol.AUTOIMPORTS.includes(symbName));
	}
	
	static getSystemType(symbName) {
		var smb = Symbol.SYSTEMTYPES[symbName];
		return smb;
	}
	
	duplicate (typeSymb, isArray, subTypeSymbol) {
		var smb = new Symbol(
			this.name,
			typeSymb || this.typeSymbol,
			(isArray != undefined) ? isArray : this.isArray,
			this.isClass
		);
		smb.isClass= this.isClass;
		smb.members = this.members;
		smb.mySuper = this.mySuper;
		smb.myShortcut = this.myShortcut;
		smb.isAwait = this.isAwait;
		smb.superSymbol	= this.superSymbol;
		smb.isStruct = this.isStruct;
		smb.isComposite = this.isComposite;
		smb.isLiteral = this.isLiteral;
		smb.isEnum = this.isEnum;
		smb.allowed = this.allowed;
		smb.args = this.args;
		smb.subTypeSymbol = subTypeSymbol || this.subTypeSymbol;
		smb.memberOf = this.memberOf;
		smb.hasUnknownComposite = this.hasUnknownComposite;
		smb.isHeader = this.isHeader;
		return smb;
	}
	
	hasParent () {
		return this.mySuper != '';
	}
	
	isShortcut () {
		return this.myShortcut != '';
	}
	
	isVariable () {
		return this.name != this.typeSymbol.name;
	}
	
	isIterable () {
		return ['مصفوفة', 'منوع', 'نوعبنية', 'نوعمركب', 'نوعتعداد', 'مجهول', 'نصية', 'مستطوف'].includes(this.typeSymbol.name)
			|| this.isArray
			|| this.typeSymbol.isStruct
			|| (this.typeSymbol.superSymbol && this.typeSymbol.superSymbol.typeIs('مصفوفة'));
	}
	
	isNull () {
		return this.typeSymbol.name == 'عدم';
	}
	
	isGeneric () {
		return Symbol.isGenericType(this.typeSymbol.name);
	}
	
	isSystem () {
		return Symbol.isSystemType(this.typeSymbol.name);
	}
	
	isPrimitive () {
		return Symbol.AUTOIMPORTS.includes(this.typeSymbol.name);
	}
	
	isAny () {
		return this.typeSymbol.name == 'منوع' || this.typeSymbol.name == 'مجهول';
	}
	
	// return true if two symbols are equivalent (same name same type same args)
	isEquivalentTo (symb) {
		// we just pass for the moment
		// BUG => https://github.com/ashrfras/jinni-compiler/issues/1
		return true;
		
		var cnd1 = this.name == symb.name &&
			this.subTypeSymbol == symb.subTypeSymbol &&
			this.args.length == symb.args.length;
			
		// TODO => type checking, deactivated
		var cnd2 = this.typeSymbol.name == symb.typeSymbol.name ||
			(this.typeSymbol.name == this.name && symb.typeSymbol.name == 'فارغ') ||
			(symb.typeSymbol.name == symb.name && this.typeSymbol.name == 'فارغ');
			
		if (!cnd1 || !cnd2) {
			return false;
		}
		
		for (var i=0; i<this.args.length; i++) {
			var argSymb1 = this.args[i].symb;
			var argSymb2 = symb.args[i].symb;
			if (!argSymb1.isEquivalentTo(argSymb2)) {
				return false;
			}
		}
		
		return true;
	}
	
	// sameTypeAs
	canBeAssignedTo (symb, printerror = true) {
		var assignFrom = this;
		var assignTo = symb;
		
		if (assignTo.isAny() || assignFrom.isAny()) {
			return true;
		}
		
		if (assignTo.isGeneric()) {
			return true;
		}
		if (assignFrom.isNull()) {
			return true;
		}
		
		if (assignFrom.isArray != assignTo.isArray) {
			return false;
		}
		
		if (assignFrom.isArray && assignTo.isArray) {
			if (assignFrom.subTypeSymbol.name == assignTo.subTypeSymbol.name) {
				return true;
			} else {
				return assignFrom.subTypeSymbol.canBeAssignedTo(assignTo.subTypeSymbol);
			}
		}
		
		// dala
		if (assignTo.typeIs('دالة') && assignFrom.typeIs('دالة')) {
			if (!assignFrom.subTypeSymbol.canBeAssignedTo(assignTo.subTypeSymbol, false)) {
				ErrorManager.error("يتوقع دالة ترد " + assignTo.subTypeSymbol.toString() + " وجد دالة ترد " + assignFrom.subTypeSymbol.toString());
				return false;
			}
			return true;
		}
		
		// DALA and Function are interchangeable
		if (assignTo.typeIs('دالة') && assignFrom.typeIs('وضيفة')) return true;
		if (assignTo.typeIs('وضيفة') && assignFrom.typeIs('دالة')) return true;
		
		// if both are compositeType (aka stuctType), all members in "from" should exist in "to"
		if (assignTo.isStructType() && assignFrom.isStructType()) {
			var canbe = true;
			// if one side is declared as "نوعمركب" we'll consider it as generic composite
			// no member checking for such generic composites (aka generic structs)
			if (assignFrom.isGenericStructType() || assignTo.isGenericStructType()) {
				//return true; TODO disabled for now
			}
			// if assign to has ... meaning has unknown composites
			// then skip member checking
			// bc assignto accepts any memeber name
			if (assignTo.hasUnknownComposite || assignTo.typeSymbol.hasUnknownComposite) {
				return true;
			}
			assignFrom.members.forEach((fromMemb) => {
				var toMemb = assignTo.checkMember(fromMemb.name, false); // false don't print error
				if (!toMemb || !fromMemb.canBeAssignedTo(toMemb, false)) {
					if (printerror) {
						ErrorManager.error("المركب " + assignFrom.toString() + " غير متجانس مع المركب " + assignTo.toString() + " [" + fromMemb.name + "]");
						return false;
						//ErrorManager.error("محاولة ئسناد " + fromMemb.toString() + " ئلا " + toMemb.toString());
					}
					canbe = false;
				}
			});
			return canbe;
		}
		
		// THIS MAY BE ORPHAN, KEEPING EYE ON IT
		// if we assign literal struct (from) to structType (to), check members
		// all members in the literal struct (from) chould exist and affects to (to) members
		// it is ok to have some missing members in the (from) struct
		if (assignTo.typeSymbol.isStruct && (assignFrom.typeIs('نوعبنية') && assignFrom.isLiteral)) {
			var canbe = true;
			// نوعبنية نب = {}
			// structType st (assignTo) = { ... } (assignFrom)
			// affecting struct literal to struct
			// check members
			assignFrom.members.forEach((fromMemb) => {
				// toMemb is the one in the left hand side: st variable
				// fromMemb is the one in the right hand side: {}
				var toMemb = assignTo.typeSymbol.checkMember(fromMemb.name);
				// check if the assigned (fromMember) exist and assignable to toMemb
				if (!fromMemb.canBeAssignedTo(toMemb, false)) {
					if (printerror) {
						ErrorManager.error("محاولة ئسناد " + fromMemb.toString() + " ئلا " + toMemb.toString());
					}
					canbe = false;
				}
			});
			return canbe;
		}
		// structType is a generic type for all Structs
		if (assignTo.typeIs('نوعبنية') && assignFrom.typeSymbol.isStruct) {
			return true;
		}
		// allowed to assign structtype to a struct
		if (assignTo.typeSymbol.isStruct && assignFrom.typeIs('نوعبنية')) {
			return true;
		}
		// ORPHAN END
		
		// enumType et = "value"
		if (assignTo.isEnum && assignFrom.typeIs('نصية')) {
			// are we assigning a literal string?
			if (assignFrom.isLiteral) { // yes, check it
				if (!assignTo.allowed.includes(assignFrom.name)) {
					ErrorManager.error("القيمة '" + assignFrom.name + "' ليست ضمن التعداد " + assignTo.toEnumString());
					return false;
				} else {
					return true;
				}
			} else { // no, warning
				ErrorManager.warning("ئستخدام متغير كقيمة للتعداد '" + assignTo.name + "' تم تجاهل الفحص");
				return true;
			}
		}
		
		var can = (assignFrom.typeSymbol.name == assignTo.typeSymbol.name);
		
		// check inheritance cycle on both sides
		[{to: assignTo, from: assignFrom}, {to: assignFrom, from: assignTo}].forEach(elem => {
			if (!can) {
				var superSymb = elem.to.typeSymbol.superSymbol;
				while (superSymb) {
					if (superSymb.typeSymbol.name === elem.from.typeSymbol.name) {
						can = true;
						break;
					}
					superSymb = superSymb.superSymbol || superSymb.typeSymbol.superSymbol;
				}
			}
		});
		
		return can;
	}
	
	isStructType () {
		return (this.typeIs('نوعمركب') || this.typeSymbol.isStruct);
	}
	
	// generic struct (or generic composite) is a variable declared with "نوعمركب"
	isGenericStructType () {
		return (this.typeIs('نوعمركب') && !this.typeSymbol.isComposite);
	}
	
	getTypeName () {
		return this.typeSymbol.name;
	}
	
	typeIs (name) {
		return this.typeSymbol.name == name;
	}
	
	typeIsNot (name) {
		return !this.typeIs(name);
	}
	
	addMember (memberSymb) {
		var memb = this.getMemberWithInfo(memberSymb);
		// if isinherited allow overwriting
		var foundSymb = memb.symb;
		if (foundSymb) {
			if (!foundSymb.isHeader && !memb.isInherited) {
				ErrorManager.error("الئسم '" + memberSymb.name + "' معرف مسبقا في الكائن " + this.toString());
			}
			if (foundSymb.isHeader) {
				if (!memberSymb.isEquivalentTo(foundSymb)) {
					ErrorManager.error("الئسم '" + memberSymb.name + "' غير متوافق مع الترويسة");
				} else {
					foundSymb.setAsHeader(false);
					foundSymb.args = memberSymb.args;
					return foundSymb;
				}
			}
			if (memb.isInherited) {
				this.members.push(memberSymb);
			}
		} else {
			this.members.push(memberSymb);
		}
		memberSymb.memberOf = this;
		if (this.isHeader) {
			memberSymb.setAsHeader(true);
		}
		return memberSymb;
	}
	
	// we may pass member funcArgs array to allow function overloading
	checkMember (memberName, printerror = true) {
		if (Symbol.isGenericType(this.typeSymbol.name)) {
			// generic types are not member checked
			return new Symbol(memberName, Symbol.SYSTEMTYPES['مجهول']);
		}
		let memberSymb;
		if (this.isStruct || this.isComposite || this.typeIs('نوعبنية') || this.typeIs('نوعمركب')) {
			memberSymb = this.getMemberName(memberName);
		} else {
			memberSymb = this.typeSymbol.getMemberName(memberName);
		}
		if (!memberSymb && printerror) {
			ErrorManager.error("الئسم '" + memberName + "' غير معروف في الكائن " + this.toString());
		}
		return memberSymb;
	}
	
	copyMembersTo(symb) {
		this.members.forEach((mm) => {
			symb.addMember(mm);
		});
	}
	
	// like getMember but returns if inherited or not
	getMemberWithInfo (symb) {
		var symbName = symb.name
		var mem = this.members.filter((m) => m.name == symbName);
		var isInherited = false;
		if (mem.length > 1) { // more than one result!
			// name has overloading, not supported yet
			ErrorManager.warning("وجود ئحتمالين متعددين للئسم " + symbName);
			mem = mem[0];
		} else if (mem.length < 1) { // unfound in this, check parents
			if (this.superSymbol) {
				mem = this.superSymbol.getMemberName(symbName);
				isInherited = true;
			} else {
				mem = null;
			}
		} else { // ==1 we got a result
			mem = mem[0];
			if (this.isHeader) {
				mem.setAsHeader(true);
			}
		}
		return {
			symb: mem,
			isInherited
		}
	}
	
	setAsHeader (y = true) {
		if (y) {
			this.isHeader = true;
			this.members.forEach(m => m.isHeader = true);
		} else {
			this.isHeader = false;
		}
	}
	
	replaceMember (member, replaceBy) {
		//member.typeSymbol = replaceBy.typeSymbol;
		//member.subTypeSymbol = replaceBy.subTypeSymbol;
		member.setAsHeader(false);
		return member;
		//var i = this.members.indexOf(member);
		//replaceBy.members = member.members; //keep symbol's members
		//this.members[i] = replaceBy;
	}
	
	getMemberName (symbName) {
		var mem = this.members.filter((m) => m.name == symbName);
		if (mem.length > 1) {
			// name has overloading, not supported yet
			ErrorManager.warning("وجود ئحتمالين متعددين للئسم " + symbName);
			mem = mem[0];
		} else if (mem.length < 1) { // unfound in this, check parents
			if (this.superSymbol) {
				mem = this.superSymbol.getMemberName(symbName);
			} else {
				mem = null;
			}
		} else {
			mem = mem[0];
			if (this.isHeader) {
				mem.setAsHeader(true);
			}
		}
		return mem;
	}
	
	getMember (symb) {
		return this.getMemberName(symb.name);
	}
	
	// array params should be homegeneous
	checkArrayHomogeny (symbs, subType) {
		var args = this.args; // this is a function of array like push()
		//console.log(this);
		for (var i=0; i<args.length; i++) {
			var mySymb = args[i].symb;
			var thatArg = symbs[i] ? symbs[i].symb : null;
			// when a param in Array function is majhoul, means it needs to be homogeneousity verified
			if (mySymb.typeIs('مجهول')) {
				// this arg requires homogeneity
				if (!thatArg.canBeAssignedTo(subType, false)) { // false don't print error
					// well print it here customized
					ErrorManager.error(thatArg.toString() + " ليس من نوع المصفوفة '" + subType.name + "[]'");
				}
			}
		}
	}
	
	// check function arguments against a given list of symbols
	checkArgs (symbs) {
		var requiredParams = this.args.filter(a => !a.init);
		
		if (this.typeIs('مجهول')) return symbs.map(s => s.value);
		
		// given params should be same length or bigger then of required params
		if (requiredParams.length > symbs.length) {
			ErrorManager.error("عدد معطيين قليل في " + this.toFuncString() + " توقع " + requiredParams.length + " وجد " + symbs.length);
			return;
		}
		
		// given params should be equal or less than param length
		if (this.args.length < symbs.length) {
			ErrorManager.error("عدد معطيين كتير في " + this.toFuncString() + " توقع " + this.args.length + " وجد " + symbs.length);
			return;
		}
		
		// if at least one given arg has name specified then this is a named arg check
		var isNamedArgs = symbs.some(item => item.name != null);
		
		if (isNamedArgs) {
			// if a mixture of named and unammed, error
			if (symbs.some(item => item.name == null)) {
				ErrorManager.error("تمرير مزيج من المعطيين المسمين والموضعيين");
				return;
			}
			return this.checkNamedArgs (symbs);
		} else {
			return this.checkPositionalArgs (symbs);
		}
	}
	
	checkNamedArgs (symbs) {
		var outputValues = [];

		for (var i=0; i<this.args.length; i++) {
			var mySymb = this.args[i];
			var thatSymb = symbs.find(s => s.name == mySymb.symb.name);
			if (!thatSymb) {
				if (!mySymb.init) { // required param
					ErrorManager.error("لم يتم تمرير المعطا الئجباري " + mySymb.symb.toString() + " في " + this.toFuncString());
					break;
				} else { // optional param
					outputValues.push('undefined');
				}
			} else { // we have that param given
				if (!thatSymb.symb.canBeAssignedTo(mySymb.symb)) {
					ErrorManager.error("المعطا المسما " + thatSymb.name + ' (' + thatSymb.symb.toString() + ")" +
					" غير متوافق. يتوقع " + mySymb.symb.toTypeString() + " في " + this.toFuncString() 
					);
					break;
				}
				outputValues.push(thatSymb.value);
			}
		}
		// if still other params in the input symns, then error
		if (outputValues.filter(o => o != 'undefined').length != symbs.length) {
			ErrorManager.error("معطيين ئضافيين غير صالحين في " + this.toFuncString());
		}
		return outputValues;
	}
	
	checkPositionalArgs (symbs) {
		var outputValues = [];
		
		for (var i=0; i<this.args.length; i++) {
			var myArg = this.args[i];
			var thatArg = symbs[i] ? symbs[i].symb : null;
			if (!thatArg) {
				if (!myArg.init) { // arg is required
					ErrorManager.error("لم يتم تمرير المعطا الئجباري " + myArg.symb.toString());
					break;
				} else { // arg is optional
					continue;
				}
			}
			if (!thatArg.canBeAssignedTo(myArg.symb)) {
				ErrorManager.error("المعطا الموضعي " + thatArg.toString() +
					" غير متوافق. يتوقع " + myArg.symb.toTypeString() + " في " + this.toFuncString() 
				);
				break;
			}
			outputValues.push(symbs[i].value);
		}
		return outputValues;
	}
	
	toString () {
		if (this.isLiteral || this.isComposite) {
			var name = this.name ? this.name + ' ' : '';
			return "'" + name + "{" + this.members.map(e => e.name) + "}'";
		} else if (this.isClass || Symbol.isSystemType(this.name)) {
			return "'" + this.name + "'";	
		} else {
			return ("'" + 
				(this.name != '' ? this.name + ' ك ' : '') + 
				(this.isArray ? this.subTypeSymbol.name : this.typeSymbol.name) +
				(this.isArray ? '[]' : '') +
			"'");
		} 
	}
	
	toTypeString () {
		return "'" + this.getTypeName() +
			(this.isArray ? "[]" : "") +
			"'";
	}
	
	toFuncString () { // add arguments later
		return "'" + this.name + " (" +
			this.args.map(item => item.symb.toTypeString()).join('، ') +
			")'";
	}
	
	toEnumString () {
		return "'" + this.name + " [" +
			this.allowed.join('، ') +
		"]";
	}
}

export default Symbol;