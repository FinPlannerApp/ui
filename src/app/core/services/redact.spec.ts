import { redact } from './diagnostics.service';

describe('redact', () => {
  it('removes amounts, e-mails, long numbers and tokens but keeps the words', () => {
    expect(redact('Pay ₹12,000 now')).toBe('Pay [amount] now');
    expect(redact('Rs. 450.50 due')).toBe('[amount] due');
    expect(redact('balance 1,23,456')).toBe('balance [amount]');
    expect(redact('mail me@example.com')).toBe('mail [email]');
    expect(redact('card 4111111111111111')).toBe('card [number]');
    expect(redact('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij')).toBe('Bearer [token]');
  });
  it('leaves ordinary text and small numbers alone', () => {
    expect(redact('Save button, page 2 of 5')).toBe('Save button, page 2 of 5');
  });
});
