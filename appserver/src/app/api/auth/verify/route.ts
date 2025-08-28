import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

// JWT secret - in production, use a strong secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, nonce, signature } = await request.json();

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Wallet address, signature, and nonce are required' },
        { status: 400 }
      );
    }

    // Verify the signature
    const message = `Sign in to Cartfree: ${nonce}`;
    
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          walletAddress: walletAddress.toLowerCase(),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        },
        JWT_SECRET
      );

      // Set HTTP-only cookie
      const response = NextResponse.json({ 
        success: true, 
        message: 'Authentication successful',
        token 
      });

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      });

      return response;

    } catch (verifyError) {
      console.error('Signature verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Error in authentication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
