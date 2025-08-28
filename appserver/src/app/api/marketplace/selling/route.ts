import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with server-side credentials
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
          sellingOrders: []
        });
      }
      
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Get user's selling orders (transactions where user is seller)
    const { data: sellingOrders, error: ordersError } = await supabase
      .from('transactions')
      .select(`
        *,
        listings:listing_id (
          title,
          description,
          price
        ),
        buyer:buyer_id (
          wallet_address
        )
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching selling orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch selling orders' },
        { status: 500 }
      );
    }

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
