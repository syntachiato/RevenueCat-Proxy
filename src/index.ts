/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const { host, pathname } = url;

		if (pathname === '/robots.txt') {
			const robots = `
			User-agent: *
	  		Disallow: /
		  `;
			return new Response(robots, { status: 200 });
		}

		const targetDomain = 'api.revnuecat.com';
		const origin = `https://${targetDomain}`;
		const actualUrl = new URL(`${origin}${pathname}${url.search}${url.hash}`);

		const modifiedRequestInit: RequestInit = {
			method: request.method,
			headers: request.headers,
			redirect: 'follow',
		};

		if (!['GET', 'HEAD'].includes(request.method)) {
			const requestBody = await request.clone().arrayBuffer();
			modifiedRequestInit.body = requestBody;
		}

		const modifiedRequest = new Request(actualUrl, modifiedRequestInit);

		const response = await fetch(modifiedRequest);

		let body = await response.arrayBuffer();
		const contentType = response.headers.get('content-type');

		// Check if the 'content-type' exists and matches JavaScript or any text/* types (e.g., text/html, text/xml)
		if (contentType && /^(application\/x-javascript|text\/)/i.test(contentType)) {
			let text = new TextDecoder('utf-8').decode(body);

			// Replace all instances of the proxy site domain with the current host domain in the text
			text = text.replace(new RegExp(`(//|https?://)${targetDomain}`, 'g'), `$1${host}`);
			body = new TextEncoder().encode(text).buffer;
		}

		const modifiedResponse = new Response(body, response);
		modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
		return modifiedResponse;
	},
} satisfies ExportedHandler<Env>;
