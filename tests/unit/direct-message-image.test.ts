import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  compressDirectMessageImage,
  directMessageImageLimits,
} from '../../lib/images/compressDirectMessageImage';

test('normalizes and downsizes direct-message photos', async () => {
  const source = await sharp({
    create: { width: 3200, height: 2400, channels: 3, background: '#2b7da1' },
  })
    .jpeg({ quality: 100 })
    .toBuffer();

  const optimized = await compressDirectMessageImage(source);
  const metadata = await sharp(optimized.buffer).metadata();

  assert.equal(optimized.contentType, 'image/webp');
  assert.equal(metadata.format, 'webp');
  assert.ok(Math.max(metadata.width ?? 0, metadata.height ?? 0) <= directMessageImageLimits.maxEdge);
  assert.ok(optimized.buffer.length <= directMessageImageLimits.targetBytes);
});

test('rejects invalid image payloads', async () => {
  await assert.rejects(() => compressDirectMessageImage(Buffer.from('not an image')));
});
