/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { issuer } from '@openauthjs/openauth';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import { PasswordProvider } from '@openauthjs/openauth/provider/password';
import { PasswordUI } from '@openauthjs/openauth/ui/password';
import { createSubjects } from '@openauthjs/openauth/subject';
import { object, string } from 'valibot';

const users = new Map();

const subjects = createSubjects({
	user: object({
		id: string(),
	}),
});

const storage = MemoryStorage();

async function getOrCreateUser(email) {
	let user = users.get(email);
	if (!user) {
		user = {
			id: crypto.randomUUID(),
		};
		users.set(email, user);
	}
	return user;
}

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === '/') {
			url.searchParams.set('redirect_uri', url.origin + '/callback');
			url.searchParams.set('client_id', 'your-client-id');
			url.searchParams.set('response_type', 'code');
			url.pathname = '/authorize';
			return Response.redirect(url.toString());
		} else if (url.pathname === '/callback') {
			return Response.json({
				message: 'OAuth flow complete!',
				params: Object.fromEntries(url.searchParams.entries()),
			});
		}

		return issuer({
			storage,
			subjects,
			providers: {
				password: PasswordProvider(
					PasswordUI({
						sendCode: async (email, code) => {
							console.log(`Sending code ${code} to ${email}`);
						},
					})
				),
			},
			success: async (ctx, value) => {
				if (value.provider !== 'password') {
					throw new Error('Invalid provider');
				}
				console.log(value.email);
				const userID = await getOrCreateUser(value.email);
				return ctx.subject('user', { userID });
			},
		}).fetch(request, env, ctx);
	},
};
