import { NextResponse } from 'next/server';
import { z } from 'zod';
import { discover } from '@/lib/balances/discover';

export const runtime = 'nodejs';

const Body = z.object({
  evmAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  solanaAddress: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    .optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!body.evmAddress && !body.solanaAddress) {
    return NextResponse.json({ error: 'Provide at least one wallet address' }, { status: 400 });
  }
  try {
    const data = await discover(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Discovery failed' }, { status: 500 });
  }
}
