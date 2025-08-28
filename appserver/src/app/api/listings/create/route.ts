import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import sharp from 'sharp';

// Initialize Supabase client with server-side credentials
const supabase = createSupabaseServerClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const walletAddress = formData.get('walletAddress') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const imageFile = formData.get('image') as File | null;

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

    if (userQueryError && userQueryError.code !== 'PGRST116') {
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

    let imageUrl = null;

    // Process image if provided
    if (imageFile) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Resize and compress image to ~100KB
        const processedImage = await sharp(buffer)
          .resize(1200, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 80,
            progressive: true 
          })
          .toBuffer();

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `listings/${userId}/${timestamp}-${randomString}.jpg`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('marketplace-images')
          .upload(fileName, processedImage, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
          );
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('marketplace-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;

      } catch (imageError) {
        console.error('Error processing image:', imageError);
        return NextResponse.json(
          { error: 'Failed to process image' },
          { status: 500 }
        );
      }
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
          image_url: imageUrl,
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
