import { issuer } from '@openauthjs/openauth';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google';
import { createSubjects } from '@openauthjs/openauth/subject';
import { object, string } from 'valibot';

const users = new Map();

const subjects = createSubjects({
	user: object({
		id: string(),
	}),
});

const storage = MemoryStorage();

// Allowed redirect URIs for the cloudflare-api client
const allowedRedirectURIs = [
	'https://auth.bloggingcounter.pages.dev/auth/callback',
	'https://blogging-counter-auth-server.jett-p-baker.workers.dev/auth/callback',
	'http://localhost:8787/auth/callback',
];

async function getOrCreateUser(email) {
	let user = users.get(email);
	if (!user) {
		user = {
			id: crypto.randomUUID(),
		};
		users.set(email, user);
	}
	return user.id;
}

export default {
	fetch(request, env, ctx) {
		return issuer({
			storage,
			subjects,
			providers: {
				google: GoogleOidcProvider({
					clientID: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
					scopes: ['openid', 'email', 'profile'],
				}),
			},
			// Permit our Pages client to use the callback URI
			allow: async ({ clientID, redirectURI }) => {
				// Only allow the registered client id
				if (clientID !== 'cloudflare-api') return false;
				return allowedRedirectURIs.includes(redirectURI);
			},
			success: async (ctx, value) => {
				if (value.provider !== 'google') {
					throw new Error('Invalid provider');
				}

				const email = value.id.email;

				const id = await getOrCreateUser(email);

				try {
					const result = await ctx.subject('user', { id });
					return result;
				} catch (error) {
					console.error('Error creating subject:', error);
					throw error;
				}
			},
		}).fetch(request, env, ctx);
	},
};
