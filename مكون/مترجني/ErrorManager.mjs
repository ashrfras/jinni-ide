export class ErrorManager {
	static errorRegistry = [];
	static lineShift = {}; // we save line shifting over files
	static isBlocking = false; // is there a blocking error in our registry
	static showWarnings = true;
	static lexer;
	static input;
	
	static ctx;
	static file;
	
	static clear () {
		ErrorManager.errorRegistry = [];
	}
	
	static setContext (ctx, file) {
		ErrorManager.ctx = ctx;
		ErrorManager.file = file;
	}
	
	static setFunc (func) {
		ErrorManager.func = func;
	}
	
	static hasErrors () {
		return ErrorManager.isBlocking;
	}
	
	static addShiftLine () {
		var shift = ErrorManager.lineShift[ErrorManager.file];
		if (shift) {
			ErrorManager.lineShift[ErrorManager.file] = shift+1;
		} else {
			ErrorManager.lineShift[ErrorManager.file] = 1;
		}
	}
	
	static error (msg) {
		var n = ErrorManager.lexer.yylineno;
		var lines = ErrorManager.input.split('\n');
		var currentline = lines[n];
		
		ErrorManager.errorRegistry.push(
			new Error (Error.BLOCKING, ErrorManager.file, ErrorManager.func, ErrorManager.ctx?.first_line, msg, ErrorManager.ctx, currentline)
		);
		ErrorManager.isBlocking = true;
	}
	
	static errorProbable (msg, tag) {
		ErrorManager.errorRegistry.push(
			new Error (Error.PROBABLE, ErrorManager.file, ErrorManager.func, ErrorManager.ctx?.first_line, msg, ErrorManager.ctx, ErrorManager.tag)
		);
		ErrorManager.isBlocking = true;
	}
	
	static warning (msg) {
		var n = ErrorManager.lexer.yylineno;
		var lines = ErrorManager.input.split('\n');
		var currentline = lines[n];
		
		ErrorManager.errorRegistry.push(
			new Error (Error.WARNING, ErrorManager.file, ErrorManager.func, ErrorManager.ctx.first_line, msg, ErrorManager.ctx, currentline)
		);
	}
	
	static printAll(exit = true) {
		var warnings = ErrorManager.errorRegistry.filter(er => er.type == Error.WARNING);
		var errors = ErrorManager.errorRegistry.filter(er => er.type == Error.BLOCKING);
		// we don't want warnings of stdlib
		warnings = warnings.filter(wr => !wr.file.startsWith('ئساسية'));
		//if (ErrorManager.showWarnings) {
			//warnings.forEach (wr => { wr.print(); console.log('==='); });
		//}
		//errors.forEach (er => { er.print(); console.log('==='); });
		var result = {
			كمخطئ: errors.length,
			كمتحدير: warnings.length,
			خطئين: errors.map(er => er.format()),
			تحديرين: warnings.map(warn => warn.format())
		}
		
		if (exit) {
			throw result;
		} else {
			return result;
		}
	}
	
	static clearProbable (tag) {
		ErrorManager.errorRegistry = ErrorManager.errorRegistry.filter(er =>
			!(er.type == Error.PROBABLE && er.tag == tag)
		);
	}
}

export class Error {
	static WARNING = 0;
	static BLOCKING = 1;
	static PROBABLE = 2;
	
	type;
	message;
	file;
	func;
	line;
	ctx;
	currentline;
	
	constructor (type, file, func, line, msg, ctx, currentline) {
		this.type = type;
		this.message = msg;
		this.file = file;
		this.func = func;
		this.line = line;
		this.ctx = ctx;
		this.currentline = currentline;
	}
	
	format () {
		var line = this.line;
		var lines = this.message.split('\n');

		if (this.type == Error.WARNING) {
			return {
				نوع: 'تحدير',
				وحدة: this.file,
				بطاقة: this.func,
				رسالة: lines[lines.length-5] || this.message,
				سطرئدخال: this.currentline
			}
		} else {
			return {
				نوع: 'خطئ',
				وحدة: this.file,
				بطاقة: this.func,
				رسالة: lines[lines.length-5] || this.message,
				سطرئدخال: this.currentline
			}
		}
	}
	
	print () {
		//console.log(ErrorManager.lineShift[ErrorManager.file]);
		var line = this.line;// + (ErrorManager.lineShift[ErrorManager.file] || 0);
		if (this.type == Error.WARNING) {
			console.warn(
				'تحدير' + '\n'
				+ 'ملف: ' + this.file + '\n'
				+ 'في: ' + this.func + '\n'
				+ 'سطر: ' + line + '\n'
				+ this.message
			);
		} else { //if (this.type == Error.BLOCKING) {
			console.error(
				'خطئ ' + '\n'
				+ 'ملف: ' + this.file + '\n'
				+ 'في: ' + this.func + '\n'
				+ 'سطر: ' + line + '\n'
				+ this.message
			);
		}
	}
	
}

export default ErrorManager;