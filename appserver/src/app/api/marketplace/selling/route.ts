import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSellingOrders } from '@/lib/supabase/queries';

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

    // Use reusable helper to fetch selling orders and normalize joins/fallbacks
    const sellingOrders = await getSellingOrders(supabase, walletAddress);

    return NextResponse.json({
      success: true,
      sellingOrders
    });

  } catch (error) {
    console.error('Unexpected error in selling orders fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
