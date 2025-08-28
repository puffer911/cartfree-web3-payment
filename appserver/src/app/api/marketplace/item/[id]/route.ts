import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Fetch the item with seller information
    const { data: item, error } = await supabase
      .from('listings')
      .select(`
        *
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
