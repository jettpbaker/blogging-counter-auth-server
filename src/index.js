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
			success: async (ctx, value) => {
				console.log('SUCCESS CALLBACK TRIGGERED!');
				console.log('Email:', value.id.email);

				if (value.provider !== 'google') {
					throw new Error('Invalid provider');
				}

				const email = value.id.email;
				console.log('Creating user for email:', email);

				const id = await getOrCreateUser(email);
				console.log('Generated user ID:', id);

				try {
					const result = await ctx.subject('user', { id });
					console.log('Subject created successfully:', result);
					return result;
				} catch (error) {
					console.error('Error creating subject:', error);
					throw error;
				}
			},
		}).fetch(request, env, ctx);
	},
};
