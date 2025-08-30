import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBuyingOrders } from '@/lib/supabase/queries';

// Initialize Supabase client with server-side credentials
const supabase = createSupabaseServerClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Use reusable helper to fetch buying orders and normalize joins/fallbacks
    const buyingOrders = await getBuyingOrders(supabase, walletAddress);

    return NextResponse.json({
      success: true,
      buyingOrders
    });

  } catch (error) {
    console.error('Unexpected error in buying orders fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
