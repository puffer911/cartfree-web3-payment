import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    // Get user ID from wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError) {
      // User not found - return empty orders instead of error
      if (userError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          buyingOrders: []
        });
      }
      
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Get user's buying orders (transactions where user is buyer)
    const { data: buyingOrders, error: ordersError } = await supabase
      .from('transactions')
      .select(`
        *,
        listings:listing_id (
          title,
          description,
          price
        ),
        seller:seller_id (
          wallet_address
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching buying orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch buying orders' },
        { status: 500 }
      );
    }

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
