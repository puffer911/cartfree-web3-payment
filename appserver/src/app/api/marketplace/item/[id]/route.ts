import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Initialize Supabase client with server-side credentials
const supabase = createSupabaseServerClient();

export async function GET(
  request: NextRequest,
  context: any
) {
const { params } = context;
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Fetch the item with seller information (join seller via seller_id)
    const { data: item, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id(
          id,
          wallet_address
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        status: item.status,
        image_url: item.image_url,
        seller: item.seller
      }
    });

  } catch (error) {
    console.error('Error in item API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
