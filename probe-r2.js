// R2 Handshake Probe Script
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_BUCKET,
} = process.env;

console.log('🔍 R2 Connection Probe');
console.log('=====================');

// Check environment variables
console.log('📋 Environment Check:');
console.log(`R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`R2_ACCOUNT_ID: ${R2_ACCOUNT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`R2_BUCKET: ${R2_BUCKET ? '✅ Set' : '❌ Missing'}`);
console.log(`Endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
console.log('');

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET) {
  console.error('❌ Missing required environment variables in .env');
  console.error('');
  console.error('📝 Please create a .env file with:');
  console.error('R2_ACCESS_KEY_ID=your_access_key_here');
  console.error('R2_SECRET_ACCESS_KEY=your_secret_key_here');
  console.error('R2_ACCOUNT_ID=your_account_id_here');
  console.error('R2_BUCKET=your_bucket_name_here');
  process.exit(1);
}

// Create R2 client with exact configuration from Cloudflare official docs
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  // Essential for SSL handshake (not in docs but required)
  forcePathStyle: true,
  // Required for compatibility with R2 (from official docs)
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

console.log('🔗 Testing R2 Handshake...');
const startTime = Date.now();

try {
  const result = await r2.send(new ListBucketsCommand({}));
  const duration = Date.now() - startTime;
  
  console.log(`✅ Handshake SUCCESS in ${duration}ms`);
  console.log('📦 Available buckets:');
  
  if (result.Buckets && result.Buckets.length > 0) {
    result.Buckets.forEach(bucket => {
      console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
    });
  } else {
    console.log('  No buckets found');
  }
  
  console.log('');
  console.log('🎉 R2 connection is working perfectly!');
  console.log('✨ SSL handshake error is FIXED!');
  
} catch (error) {
  const duration = Date.now() - startTime;
  console.error(`❌ Handshake FAILED after ${duration}ms`);
  console.error('Error details:', error.message);
  
  if (error.message.includes('EPROTO') || error.message.includes('handshake failure')) {
    console.error('');
    console.error('🚨 Still getting SSL handshake errors!');
    console.error('💡 Check:');
    console.error('   - Account ID is correct');
    console.error('   - Credentials are valid');
    console.error('   - Network connectivity');
  }
  
  process.exit(1);
} 