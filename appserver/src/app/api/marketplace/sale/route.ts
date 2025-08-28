import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Initialize Supabase client with server-side credentials
const supabase = createSupabaseServerClient();

export async function GET(request: NextRequest) {
  try {
    // Get all active listings (items for sale)
    const { data: saleItems, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id (
          wallet_address
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sale items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sale items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saleItems
    });

  } catch (error) {
    console.error('Unexpected error in sale items fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
