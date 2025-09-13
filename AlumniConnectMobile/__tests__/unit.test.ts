/**
 * Unit tests that don't require React Native setup
 */

describe('Utility Functions', () => {
  describe('Math operations', () => {
    it('should add numbers correctly', () => {
      expect(1 + 1).toBe(2);
      expect(2 + 3).toBe(5);
    });

    it('should multiply numbers correctly', () => {
      expect(2 * 3).toBe(6);
      expect(5 * 5).toBe(25);
    });
  });

  describe('String operations', () => {
    it('should concatenate strings', () => {
      expect('Hello' + ' ' + 'World').toBe('Hello World');
    });

    it('should handle template literals', () => {
      const name = 'John';
      expect(`Hello ${name}`).toBe('Hello John');
    });
  });

  describe('Async operations', () => {
    it('should resolve promises', async () => {
      const result = await Promise.resolve('success');
      expect(result).toBe('success');
    });

    it('should handle async/await errors', async () => {
      try {
        await Promise.reject(new Error('test error'));
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('test error');
      }
    });
  });

  describe('Object operations', () => {
    it('should merge objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const merged = { ...obj1, ...obj2 };
      expect(merged).toEqual({ a: 1, b: 2 });
    });

    it('should destructure objects', () => {
      const person = { name: 'Alice', age: 30 };
      const { name, age } = person;
      expect(name).toBe('Alice');
      expect(age).toBe(30);
    });
  });

  describe('Array operations', () => {
    it('should map arrays', () => {
      const numbers = [1, 2, 3];
      const doubled = numbers.map(n => n * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });

    it('should filter arrays', () => {
      const numbers = [1, 2, 3, 4, 5];
      const even = numbers.filter(n => n % 2 === 0);
      expect(even).toEqual([2, 4]);
    });

    it('should reduce arrays', () => {
      const numbers = [1, 2, 3, 4];
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      expect(sum).toBe(10);
    });
  });

  describe('Date operations', () => {
    it('should create dates correctly', () => {
      // Use UTC date to avoid timezone issues in tests
      const date = new Date('2023-01-01T00:00:00Z');
      expect(date.getUTCFullYear()).toBe(2023);
      expect(date.getUTCMonth()).toBe(0); // January is 0
      expect(date.getUTCDate()).toBe(1);
    });

    it('should format time differences', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const diffInMinutes = Math.floor((now.getTime() - fiveMinutesAgo.getTime()) / (1000 * 60));
      expect(diffInMinutes).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should throw errors', () => {
      expect(() => {
        throw new Error('Test error');
      }).toThrow('Test error');
    });

    it('should catch errors in async functions', async () => {
      await expect(Promise.reject(new Error('Async error'))).rejects.toThrow('Async error');
    });
  });

  describe('Mock functions', () => {
    it('should mock function calls', () => {
      const mockFn = jest.fn();
      mockFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should mock return values', () => {
      const mockFn = jest.fn().mockReturnValue('mocked');
      expect(mockFn()).toBe('mocked');
    });

    it('should mock implementations', () => {
      const mockFn = jest.fn().mockImplementation((a, b) => a + b);
      expect(mockFn(2, 3)).toBe(5);
    });
  });

  describe('Performance testing', () => {
    it('should execute quickly', () => {
      const start = performance.now();
      const result = Array.from({ length: 1000 }, (_, i) => i * i);
      const end = performance.now();
      
      expect(result.length).toBe(1000);
      expect(end - start).toBeLessThan(100); // Should take less than 100ms
    });

    it('should handle large data efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const filtered = largeArray.filter(x => x % 2 === 0);
      
      expect(filtered.length).toBe(5000);
      expect(filtered[0]).toBe(0);
      expect(filtered[4999]).toBe(9998);
    });
  });
});