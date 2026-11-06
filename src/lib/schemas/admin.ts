import { z } from 'zod';

export const categoryNameSchema = z
	.string()
	.trim()
	.min(2, 'Mindestens 2 Zeichen.')
	.max(60, 'Höchstens 60 Zeichen.');
