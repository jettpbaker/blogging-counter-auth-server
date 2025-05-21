import { issuer } from '@openauthjs/openauth';
import { PasswordProvider } from '@openauthjs/openauth/providers';
import { PasswordUI } from '@openauthjs/openauth/ui/password';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import { object, string } from 'valibot';

const users = new Map();

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

const subjects = createSubjects({
	user: object({
		id: string(),
	}),
});

const app = issuer({
	providers: {
		password: PasswordProvider(
			PasswordUI({
				sendCode: async (email, code) => {
					console.log(email, code);
				},
			})
		),
	},
	storage: MemoryStorage(),
	subjects,
	success: async (ctx, value) => {
		let userID;
		if (value.provider !== 'password') {
			throw new Error('Invalid provider');
		}
		console.log(value.email);
		userID = await getOrCreateUser(value.email);
		return ctx.subject('user', {
			userID,
		});
	},
});

export default app;
