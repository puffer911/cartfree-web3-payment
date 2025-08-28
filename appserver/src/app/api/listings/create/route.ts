import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with server-side credentials
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!; // Use service role key for server-side operations

const supabase = createClient(supabaseUrl, supabaseKey);

interface CreateListingRequest {
  walletAddress: string;
  title: string;
  description: string;
  price: number;
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, title, description, price }: CreateListingRequest = await request.json();

    // Validate required fields
    if (!walletAddress || !title || !price) {
      return NextResponse.json(
        { error: 'Wallet address, title, and price are required' },
        { status: 400 }
      );
    }

    // First, create or get user
    const { data: existingUser, error: userQueryError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userQueryError && userQueryError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error querying user:', userQueryError);
      return NextResponse.json(
        { error: 'Failed to query user' },
        { status: 500 }
      );
    }

    let userId = existingUser?.id;

    if (!userId) {
      const { data: newUser, error: userCreateError } = await supabase
        .from('users')
        .insert([{ wallet_address: walletAddress }])
        .select('id')
        .single();

      if (userCreateError) {
        console.error('Error creating user:', userCreateError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      userId = newUser.id;
    }

    // Create listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert([
        {
          seller_id: userId,
          title,
          description,
          price,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (listingError) {
      console.error('Error creating listing:', listingError);
      return NextResponse.json(
        { error: 'Failed to create listing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully',
      listing
    });

  } catch (error) {
    console.error('Unexpected error in listing creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
