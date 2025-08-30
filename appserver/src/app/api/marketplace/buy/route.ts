import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Initialize Supabase client with server-side credentials
const supabase = createSupabaseServerClient();

interface BuyRequest {
  walletAddress: string;
  listingId: string;
  amount: number;
  sourceChain: string;
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, listingId, amount, sourceChain }: BuyRequest = await request.json();

    if (!walletAddress || !listingId || !amount || !sourceChain) {
      return NextResponse.json(
        { error: 'Wallet address, listing ID, amount, and source chain are required' },
        { status: 400 }
      );
    }

    // Get buyer user ID
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (buyerError) {
      console.error('Error fetching buyer:', buyerError);
      return NextResponse.json(
        { error: 'Buyer not found. Please ensure your wallet is properly connected.' },
        { status: 404 }
      );
    }

    // Get listing and seller info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, seller:seller_id(*)')
      .eq('id', listingId)
      .single();

    if (listingError) {
      console.error('Error fetching listing:', listingError);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Create transaction (record as paid and return buyer/seller join info)
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          listing_id: listingId,
          buyer_id: buyer.id,
          seller_id: listing.seller_id,
          amount: amount,
          source_chain: sourceChain,
          status: 'paid'
        }
      ])
      .select(`
        *,
        listings:listing_id (
          title
        ),
        buyer:buyer_id (
          wallet_address
        ),
        seller:seller_id (
          wallet_address
        )
      `)
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase initiated successfully',
      transaction
    });

  } catch (error) {
    console.error('Unexpected error in buy operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
