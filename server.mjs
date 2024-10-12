import express from 'express';

const app = express();
const PORT = 3000;
app.use(express.urlencoded());
app.use(express.json());
app.use(express.raw());

// from __خام__/مشتغلات.جني
import * as workers from './__%D8%AE%D8%A7%D9%85__/%D9%85%D8%B4%D8%AA%D8%BA%D9%84%D8%A7%D8%AA.mjs';
for (const workername in workers) {
	app.get('/' + encodeURI(workername), (req, res) => { return workers[workername](req, res) });
	app.post('/' + encodeURI(workername), (req, res) => { return workers[workername](req, res) });
	app.put('/' + encodeURI(workername), (req, res) => { return workers[workername](req, res) });
	app.delete('/' + encodeURI(workername), (req, res) => { return workers[workername](req, res) });
}

app.use(express.static('.', {
	extensions: ['js', 'html', 'جني', 'css'],
	setHeaders: function (res, path, stat) {
		if (path.includes('.جني')) { res.type('application/javascript') }
	}
}));

app.listen(PORT, () => console.log('الخادم شغال'));