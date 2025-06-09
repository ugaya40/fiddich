import { createCell } from './src/createCell.js';
import { atomicUpdate } from './src/atomicUpdate.js';

const cell = createCell(1);
console.log('Initial cell version:', cell.version);

const promise1 = atomicUpdate(async ops => {
  console.log('Promise1 start, cell version:', cell.version);
  await new Promise(resolve => setTimeout(resolve, 10));
  console.log('Promise1 setting cell to 2, cell version before:', cell.version);
  ops.set(cell, 2);
  console.log('Promise1 completed');
}).catch(err => {
  console.log('Promise1 failed:', err.message);
  return 'FAILED';
});

const promise2 = atomicUpdate(async ops => {
  console.log('Promise2 start, cell version:', cell.version);
  await new Promise(resolve => setTimeout(resolve, 20));
  console.log('Promise2 setting cell to 3, cell version before:', cell.version);
  ops.set(cell, 3);
  console.log('Promise2 completed');
}).catch(err => {
  console.log('Promise2 failed:', err.message);
  return 'FAILED';
});

const results = await Promise.all([promise1, promise2]);
console.log('Final results:', results);
console.log('Final cell value:', cell.stableValue);
console.log('Final cell version:', cell.version);