/**
 * Profile Frontend Module Unit Tests
 * Tests for ProfileCache, batchGetProfiles, checkProfileCompleteness, and localStorage functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileCache, getProfileCache, batchGetProfiles, checkProfileCompleteness, saveProfileToLocalStorage, loadProfileFromLocalStorage, clearProfileFromLocalStorage, createOptimisticProfileUpdate, uploadAvatar, } from '../profile.js';
// Enable fake timers for all tests
vi.useFakeTimers();
// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;
// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});
// Mock XMLHttpRequest - Simple factory that returns a mock object
const mockXHROpen = vi.fn();
const mockXHRSend = vi.fn();
const mockXHRSetRequestHeader = vi.fn();
// Store the last created XHR instance for test control
let lastXHRInstance = null;
function createMockXHR() {
    const instance = {
        upload: { onprogress: null },
        onload: null,
        onerror: null,
        status: 200,
        responseText: '',
        statusText: 'OK',
        open: vi.fn((method, url) => {
            mockXHROpen(method, url);
        }),
        setRequestHeader: vi.fn((header, value) => {
            mockXHRSetRequestHeader(header, value);
        }),
        send: vi.fn((body) => {
            mockXHRSend(body);
            lastXHRInstance = instance;
        }),
    };
    return instance;
}
Object.defineProperty(global, 'XMLHttpRequest', {
    value: vi.fn(() => createMockXHR()),
    writable: true,
});
// Mock FormData
class MockFormData {
    data = {};
    append(key, value) {
        this.data[key] = value;
    }
    get(key) {
        return this.data[key];
    }
}
Object.defineProperty(global, 'FormData', {
    value: MockFormData,
    writable: true,
});
const TEST_API_URL = 'https://api.agora.network';
const TEST_AUTH_TOKEN = 'test-token-123';
const TEST_AGENT_ID = 'agent-123';
// Helper to create mock profile
function createMockProfile(overrides = {}) {
    return {
        id: TEST_AGENT_ID,
        name: 'Test Agent',
        bio: 'A test agent for unit tests with detailed bio',
        avatarUrl: 'https://example.com/avatar.png',
        walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        level: 5,
        xp: 2500,
        reputation: 85,
        tasksCompleted: 50,
        tasksPosted: 10,
        totalEarned: '5000.00',
        totalSpent: '1000.00',
        memberSince: Date.now() - 86400000 * 30,
        lastActive: Date.now(),
        socials: {
            twitter: '@testagent',
            github: 'testagent',
            website: 'https://testagent.com',
        },
        skills: ['typescript', 'solidity', 'react'],
        isVerified: true,
        isPremium: false,
        ...overrides,
    };
}
describe('ProfileCache', () => {
    let cache;
    beforeEach(() => {
        // Reset singleton instance for clean tests
        ProfileCache.instance = null;
        cache = ProfileCache.getInstance();
    });
    afterEach(() => {
        cache.clear();
        vi.clearAllMocks();
    });
    describe('singleton pattern', () => {
        it('should return the same instance', () => {
            const instance1 = ProfileCache.getInstance();
            const instance2 = ProfileCache.getInstance();
            expect(instance1).toBe(instance2);
        });
        it('should return same instance via getProfileCache', () => {
            const cache1 = getProfileCache();
            const cache2 = getProfileCache();
            expect(cache1).toBe(cache2);
        });
        it('should create new instance only when null', () => {
            const firstInstance = ProfileCache.getInstance();
            // Creating again should return same
            const secondInstance = ProfileCache.getInstance();
            expect(firstInstance).toBe(secondInstance);
        });
    });
    describe('set and get', () => {
        it('should store and retrieve data', () => {
            const profile = createMockProfile();
            cache.set('profile:123', profile);
            const retrieved = cache.get('profile:123');
            expect(retrieved).toEqual(profile);
        });
        it('should store data with custom TTL', () => {
            const profile = createMockProfile();
            cache.set('profile:123', profile, 60000); // 1 minute TTL
            const retrieved = cache.get('profile:123');
            expect(retrieved).toEqual(profile);
        });
        it('should return undefined for non-existent key', () => {
            const result = cache.get('non-existent');
            expect(result).toBeUndefined();
        });
        it('should return undefined for expired data', () => {
            const profile = createMockProfile();
            cache.set('profile:123', profile, 1); // 1ms TTL
            // Wait for expiration
            vi.advanceTimersByTime(10);
            const retrieved = cache.get('profile:123');
            expect(retrieved).toBeUndefined();
        });
        it('should store different types of data', () => {
            cache.set('string', 'test');
            cache.set('number', 42);
            cache.set('object', { foo: 'bar' });
            cache.set('array', [1, 2, 3]);
            expect(cache.get('string')).toBe('test');
            expect(cache.get('number')).toBe(42);
            expect(cache.get('object')).toEqual({ foo: 'bar' });
            expect(cache.get('array')).toEqual([1, 2, 3]);
        });
    });
    describe('has', () => {
        it('should return true for existing valid key', () => {
            cache.set('exists', 'value');
            expect(cache.has('exists')).toBe(true);
        });
        it('should return false for non-existent key', () => {
            expect(cache.has('non-existent')).toBe(false);
        });
        it('should return false for expired key', () => {
            cache.set('expired', 'value', 1);
            vi.advanceTimersByTime(10);
            expect(cache.has('expired')).toBe(false);
        });
    });
    describe('invalidate', () => {
        it('should invalidate by exact pattern', () => {
            cache.set('profile:1', 'data1');
            cache.set('profile:2', 'data2');
            cache.set('other:1', 'data3');
            cache.invalidate('profile:');
            expect(cache.has('profile:1')).toBe(false);
            expect(cache.has('profile:2')).toBe(false);
            expect(cache.has('other:1')).toBe(true);
        });
        it('should invalidate using regex pattern', () => {
            cache.set('user:1:profile', 'data1');
            cache.set('user:2:profile', 'data2');
            cache.set('user:1:settings', 'data3');
            cache.invalidate(':profile');
            expect(cache.has('user:1:profile')).toBe(false);
            expect(cache.has('user:2:profile')).toBe(false);
            expect(cache.has('user:1:settings')).toBe(true);
        });
        it('should handle no matches gracefully', () => {
            cache.set('key1', 'value');
            cache.invalidate('nonexistent');
            expect(cache.has('key1')).toBe(true);
        });
    });
    describe('clear', () => {
        it('should clear all cached data', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.clear();
            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(false);
        });
        it('should handle clearing empty cache', () => {
            expect(() => cache.clear()).not.toThrow();
        });
    });
});
describe('batchGetProfiles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset cache
        const cache = getProfileCache();
        cache.clear();
    });
    it('should fetch profiles not in cache', async () => {
        const profiles = [
            createMockProfile({ id: 'agent-1', name: 'Agent One' }),
            createMockProfile({ id: 'agent-2', name: 'Agent Two' }),
        ];
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => profiles,
        });
        const result = await batchGetProfiles(TEST_API_URL, ['agent-1', 'agent-2'], TEST_AUTH_TOKEN);
        expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/batch`, expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
            }),
            body: JSON.stringify({ ids: ['agent-1', 'agent-2'] }),
        }));
        expect(result.get('agent-1')).toEqual(profiles[0]);
        expect(result.get('agent-2')).toEqual(profiles[1]);
    });
    it('should use cached profiles when available', async () => {
        const cachedProfile = createMockProfile({ id: 'agent-1', name: 'Cached Agent' });
        const cache = getProfileCache();
        cache.set('profile:agent-1', cachedProfile);
        const newProfile = createMockProfile({ id: 'agent-2', name: 'New Agent' });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [newProfile],
        });
        const result = await batchGetProfiles(TEST_API_URL, ['agent-1', 'agent-2'], TEST_AUTH_TOKEN);
        // Should only fetch agent-2
        expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            body: JSON.stringify({ ids: ['agent-2'] }),
        }));
        expect(result.get('agent-1')).toEqual(cachedProfile);
        expect(result.get('agent-2')).toEqual(newProfile);
    });
    it('should return all cached profiles without fetch', async () => {
        const cache = getProfileCache();
        cache.set('profile:agent-1', createMockProfile({ id: 'agent-1' }));
        cache.set('profile:agent-2', createMockProfile({ id: 'agent-2' }));
        const result = await batchGetProfiles(TEST_API_URL, ['agent-1', 'agent-2'], TEST_AUTH_TOKEN);
        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.size).toBe(2);
    });
    it('should work without auth token', async () => {
        const profiles = [createMockProfile({ id: 'agent-1' })];
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => profiles,
        });
        await batchGetProfiles(TEST_API_URL, ['agent-1']);
        expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
            }),
        }));
    });
    it('should cache fetched profiles', async () => {
        const profile = createMockProfile({ id: 'agent-1' });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [profile],
        });
        await batchGetProfiles(TEST_API_URL, ['agent-1'], TEST_AUTH_TOKEN);
        const cache = getProfileCache();
        expect(cache.has('profile:agent-1')).toBe(true);
        expect(cache.get('profile:agent-1')).toEqual(profile);
    });
    it('should throw error when fetch fails', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Server Error',
        });
        await expect(batchGetProfiles(TEST_API_URL, ['agent-1'], TEST_AUTH_TOKEN)).rejects.toThrow('Batch fetch failed: Server Error');
    });
    it('should handle empty agentIds array', async () => {
        const result = await batchGetProfiles(TEST_API_URL, [], TEST_AUTH_TOKEN);
        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.size).toBe(0);
    });
    it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        await expect(batchGetProfiles(TEST_API_URL, ['agent-1'], TEST_AUTH_TOKEN)).rejects.toThrow('Network error');
    });
});
describe('checkProfileCompleteness', () => {
    it('should return 100 for complete profile', () => {
        const profile = createMockProfile();
        const result = checkProfileCompleteness(profile);
        expect(result.score).toBe(100);
        expect(result.missing).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
    });
    it('should detect missing bio', () => {
        const profile = createMockProfile({ bio: '' });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toContain('bio');
        expect(result.suggestions).toContain('Add a detailed bio (at least 20 characters)');
        expect(result.score).toBeLessThan(100);
    });
    it('should detect short bio', () => {
        const profile = createMockProfile({ bio: 'Too short' });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toContain('bio');
        expect(result.score).toBeLessThan(100);
    });
    it('should detect missing avatar', () => {
        const profile = createMockProfile({ avatarUrl: undefined });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toContain('avatar');
        expect(result.suggestions).toContain('Upload a profile avatar');
    });
    it('should detect missing skills', () => {
        const profile = createMockProfile({ skills: [] });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toContain('skills');
        expect(result.suggestions).toContain('Add at least 3 skills');
    });
    it('should detect missing socials', () => {
        const profile = createMockProfile({ socials: undefined });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toContain('socials');
        expect(result.suggestions).toContain('Connect at least one social account');
    });
    it('should detect empty socials', () => {
        const profile = createMockProfile({ socials: {} });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toContain('socials');
    });
    it('should calculate score correctly with multiple missing fields', () => {
        const profile = createMockProfile({
            bio: '',
            avatarUrl: undefined,
            skills: [],
            socials: undefined,
        });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toHaveLength(4);
        expect(result.score).toBe(0);
    });
    it('should calculate score correctly with partial completion', () => {
        const profile = createMockProfile({
            bio: '', // missing
            avatarUrl: 'https://example.com/avatar.png', // present
            skills: ['typescript'], // present
            socials: undefined, // missing
        });
        const result = checkProfileCompleteness(profile);
        expect(result.missing).toHaveLength(2);
        expect(result.score).toBe(50);
    });
    it('should return correct structure', () => {
        const profile = createMockProfile();
        const result = checkProfileCompleteness(profile);
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('missing');
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.missing)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(typeof result.score).toBe('number');
    });
});
describe('localStorage functions', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });
    describe('saveProfileToLocalStorage', () => {
        it('should save profile to localStorage', () => {
            const profile = createMockProfile();
            saveProfileToLocalStorage(profile);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(`agora:profile:${profile.id}`, expect.any(String));
            const savedData = JSON.parse(localStorageMock.getItem(`agora:profile:${profile.id}`));
            expect(savedData.profile).toEqual(profile);
            expect(savedData.savedAt).toBeGreaterThan(0);
        });
        it('should handle undefined localStorage gracefully', () => {
            Object.defineProperty(global, 'localStorage', { value: undefined, writable: true });
            const profile = createMockProfile();
            expect(() => saveProfileToLocalStorage(profile)).not.toThrow();
            // Restore localStorage mock
            Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
        });
    });
    describe('loadProfileFromLocalStorage', () => {
        it('should load profile from localStorage', () => {
            const profile = createMockProfile();
            const savedData = {
                profile,
                savedAt: Date.now(),
            };
            localStorageMock.setItem(`agora:profile:${profile.id}`, JSON.stringify(savedData));
            const loaded = loadProfileFromLocalStorage(profile.id);
            expect(loaded).toEqual(profile);
        });
        it('should return null for non-existent profile', () => {
            const loaded = loadProfileFromLocalStorage('non-existent');
            expect(loaded).toBeNull();
        });
        it('should return null for expired data (older than 7 days)', () => {
            const profile = createMockProfile();
            const expiredData = {
                profile,
                savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
            };
            localStorageMock.setItem(`agora:profile:${profile.id}`, JSON.stringify(expiredData));
            const loaded = loadProfileFromLocalStorage(profile.id);
            expect(loaded).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(`agora:profile:${profile.id}`);
        });
        it('should return profile for fresh data', () => {
            const profile = createMockProfile();
            const freshData = {
                profile,
                savedAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
            };
            localStorageMock.setItem(`agora:profile:${profile.id}`, JSON.stringify(freshData));
            const loaded = loadProfileFromLocalStorage(profile.id);
            expect(loaded).toEqual(profile);
        });
        it('should handle invalid JSON', () => {
            localStorageMock.setItem('agora:profile:invalid', 'invalid json{');
            const loaded = loadProfileFromLocalStorage('invalid');
            expect(loaded).toBeNull();
        });
        it('should return null when localStorage is undefined', () => {
            Object.defineProperty(global, 'localStorage', { value: undefined, writable: true });
            const loaded = loadProfileFromLocalStorage(TEST_AGENT_ID);
            expect(loaded).toBeNull();
            // Restore localStorage mock
            Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
        });
    });
    describe('clearProfileFromLocalStorage', () => {
        it('should remove profile from localStorage', () => {
            clearProfileFromLocalStorage(TEST_AGENT_ID);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(`agora:profile:${TEST_AGENT_ID}`);
        });
        it('should handle undefined localStorage gracefully', () => {
            Object.defineProperty(global, 'localStorage', { value: undefined, writable: true });
            expect(() => clearProfileFromLocalStorage(TEST_AGENT_ID)).not.toThrow();
            // Restore localStorage mock
            Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
        });
    });
});
describe('createOptimisticProfileUpdate', () => {
    it('should create optimistic update with previous and updated values', () => {
        const profile = createMockProfile();
        const updates = { name: 'Updated Name', level: 10 };
        const result = createOptimisticProfileUpdate(profile, updates);
        expect(result.previous).toEqual(profile);
        expect(result.updated).toEqual({ ...profile, ...updates });
        expect(result.updated.name).toBe('Updated Name');
        expect(result.updated.level).toBe(10);
    });
    it('should not mutate original profile', () => {
        const profile = createMockProfile();
        const originalName = profile.name;
        const updates = { name: 'New Name' };
        createOptimisticProfileUpdate(profile, updates);
        expect(profile.name).toBe(originalName);
    });
    it('should provide rollback function', () => {
        const profile = createMockProfile();
        const updates = { name: 'Updated Name', bio: 'Updated bio' };
        const result = createOptimisticProfileUpdate(profile, updates);
        // Apply updates to profile (simulating optimistic update)
        Object.assign(profile, updates);
        expect(profile.name).toBe('Updated Name');
        // Rollback
        result.rollback();
        expect(profile.name).toBe('Test Agent');
        expect(profile.bio).toBe('A test agent for unit tests with detailed bio');
    });
    it('should handle empty updates', () => {
        const profile = createMockProfile();
        const result = createOptimisticProfileUpdate(profile, {});
        expect(result.previous).toEqual(profile);
        expect(result.updated).toEqual(profile);
    });
    it('should handle nested updates', () => {
        const profile = createMockProfile();
        const updates = {
            socials: { twitter: '@newhandle', github: 'newgithub' },
        };
        const result = createOptimisticProfileUpdate(profile, updates);
        expect(result.updated.socials?.twitter).toBe('@newhandle');
        expect(result.previous.socials?.twitter).toBe('@testagent');
    });
});
describe('uploadAvatar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockXHROpen.mockClear();
        mockXHRSend.mockClear();
        mockXHRSetRequestHeader.mockClear();
        lastXHRInstance = null;
    });
    it('should upload avatar using XMLHttpRequest in browser', async () => {
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        const onProgress = vi.fn();
        const uploadPromise = uploadAvatar(TEST_API_URL, file, TEST_AUTH_TOKEN, onProgress);
        // Wait for send to be called
        await vi.waitFor(() => expect(mockXHRSend).toHaveBeenCalled());
        // Simulate successful upload - update the instance that was created
        expect(lastXHRInstance).not.toBeNull();
        if (lastXHRInstance) {
            lastXHRInstance.responseText = JSON.stringify({ url: 'https://example.com/avatar.png' });
            lastXHRInstance.status = 200;
            // Trigger onload callback
            if (lastXHRInstance.onload) {
                lastXHRInstance.onload();
            }
        }
        const result = await uploadPromise;
        expect(mockXHROpen).toHaveBeenCalledWith('POST', `${TEST_API_URL}/profiles/avatar`);
        expect(mockXHRSetRequestHeader).toHaveBeenCalledWith('Authorization', `Bearer ${TEST_AUTH_TOKEN}`);
        expect(mockXHRSend).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.url).toBe('https://example.com/avatar.png');
    });
    it('should handle upload errors', async () => {
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        const uploadPromise = uploadAvatar(TEST_API_URL, file, TEST_AUTH_TOKEN);
        // Wait for send to be called
        await vi.waitFor(() => expect(mockXHRSend).toHaveBeenCalled());
        expect(lastXHRInstance).not.toBeNull();
        if (lastXHRInstance) {
            lastXHRInstance.status = 500;
            lastXHRInstance.statusText = 'Server Error';
            if (lastXHRInstance.onload) {
                lastXHRInstance.onload();
            }
        }
        const result = await uploadPromise;
        expect(result.success).toBe(false);
        expect(result.error).toBe('Server Error');
    });
    it('should handle network errors', async () => {
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        const uploadPromise = uploadAvatar(TEST_API_URL, file, TEST_AUTH_TOKEN);
        // Wait for send to be called
        await vi.waitFor(() => expect(mockXHRSend).toHaveBeenCalled());
        expect(lastXHRInstance).not.toBeNull();
        if (lastXHRInstance && lastXHRInstance.onerror) {
            lastXHRInstance.onerror();
        }
        const result = await uploadPromise;
        expect(result.success).toBe(false);
        expect(result.error).toBe('Upload failed');
    });
    it('should report progress', async () => {
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        const onProgress = vi.fn();
        const uploadPromise = uploadAvatar(TEST_API_URL, file, TEST_AUTH_TOKEN, onProgress);
        // Wait for send to be called
        await vi.waitFor(() => expect(mockXHRSend).toHaveBeenCalled());
        expect(lastXHRInstance).not.toBeNull();
        if (lastXHRInstance) {
            // Simulate progress
            const progressEvent = {
                lengthComputable: true,
                loaded: 50,
                total: 100,
            };
            if (lastXHRInstance.upload.onprogress) {
                lastXHRInstance.upload.onprogress(progressEvent);
            }
            // Complete upload
            lastXHRInstance.responseText = JSON.stringify({ url: 'https://example.com/avatar.png' });
            lastXHRInstance.status = 200;
            if (lastXHRInstance.onload) {
                lastXHRInstance.onload();
            }
        }
        await uploadPromise;
        expect(onProgress).toHaveBeenCalledWith(50);
    });
    it('should fallback to fetch when XMLHttpRequest is not available', async () => {
        // Save original XMLHttpRequest
        const originalXHR = global.XMLHttpRequest;
        Object.defineProperty(global, 'XMLHttpRequest', { value: undefined, writable: true });
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: 'https://example.com/avatar.png' }),
        });
        const result = await uploadAvatar(TEST_API_URL, file, TEST_AUTH_TOKEN);
        expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/avatar`, expect.objectContaining({
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
            body: expect.any(FormData),
        }));
        expect(result.success).toBe(true);
        expect(result.url).toBe('https://example.com/avatar.png');
        // Restore XMLHttpRequest mock
        Object.defineProperty(global, 'XMLHttpRequest', { value: originalXHR, writable: true });
    });
    it('should handle fetch fallback errors', async () => {
        // Save original XMLHttpRequest
        const originalXHR = global.XMLHttpRequest;
        Object.defineProperty(global, 'XMLHttpRequest', { value: undefined, writable: true });
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Upload failed',
        });
        const result = await uploadAvatar(TEST_API_URL, file, TEST_AUTH_TOKEN);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Upload failed');
        // Restore XMLHttpRequest mock
        Object.defineProperty(global, 'XMLHttpRequest', { value: originalXHR, writable: true });
    });
});
// Mock File for Node.js environment
class MockFile {
    name;
    type;
    content;
    constructor(parts, name, options) {
        this.name = name;
        this.type = options?.type || '';
        this.content = String(parts[0] || '');
    }
}
Object.defineProperty(global, 'File', { value: MockFile, writable: true });
console.log('[Unit Tests] Profile Frontend module test suite loaded');
//# sourceMappingURL=profile-frontend.test.js.map