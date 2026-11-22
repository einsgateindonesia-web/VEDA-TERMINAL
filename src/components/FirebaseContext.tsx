import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { ArticleItem, DisplayMode, SourceItem, ThemeMode } from '../types';

const ADMIN_EMAIL = 'einsgateindonesia@gmail.com';
const ALLOWED_CATEGORIES = ['indonesia', 'world', 'technology', 'economy', 'science', 'defense', 'cyber'] as const;
const ALLOWED_LANGUAGES = ['id', 'en'] as const;

type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];
type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];

export interface UserProfileData {
  uid: string;
  displayName: string;
  role: 'operator' | 'admin';
  theme: ThemeMode;
  displayMode: DisplayMode;
}

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  userProfile: UserProfileData | null;
  cloudBookmarks: Record<string, ArticleItem>;
  cloudCustomSources: SourceItem[];
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  toggleBookmarkInFirestore: (article: ArticleItem, currentlySaved: boolean) => Promise<void>;
  addCustomSourceInFirestore: (input: {
    name: string;
    url: string;
    category: string;
    language: string;
    description?: string;
  }) => Promise<SourceItem>;
  toggleCustomSourceInFirestore: (sourceId: string, nextActive: boolean) => Promise<void>;
  deleteCustomSourceInFirestore: (sourceId: string) => Promise<void>;
  updatePreferencesInFirestore: (prefs: { theme?: ThemeMode; displayMode?: DisplayMode }) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

function sanitizeId(raw: string, prefix: string): string {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${prefix}-${Date.now()}`;
}

function sanitizeCategory(raw: string): AllowedCategory {
  const lower = (raw || '').toLowerCase().trim();
  return (ALLOWED_CATEGORIES as readonly string[]).includes(lower)
    ? (lower as AllowedCategory)
    : 'world';
}

function sanitizeLanguage(raw: string): AllowedLanguage {
  const lower = (raw || '').toLowerCase().trim();
  return (ALLOWED_LANGUAGES as readonly string[]).includes(lower)
    ? (lower as AllowedLanguage)
    : 'en';
}

function sanitizeHttpUrl(raw: string, fallback?: string): string {
  const trimmed = (raw || '').trim().slice(0, 1000);
  if (/^https?:\/\/.+/.test(trimmed)) {
    return trimmed;
  }
  if (fallback && /^https?:\/\/.+/.test(fallback)) {
    return fallback.slice(0, 1000);
  }
  throw new Error('URL harus diawali http:// atau https://');
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [cloudBookmarks, setCloudBookmarks] = useState<Record<string, ArticleItem>>({});
  const [cloudCustomSources, setCloudCustomSources] = useState<SourceItem[]>([]);

  const profilePromiseRef = useRef<Promise<void> | null>(null);
  const ensuredUidRef = useRef<string | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const ensureUserProfile = useCallback(async (firebaseUser: User): Promise<void> => {
    if (ensuredUidRef.current === firebaseUser.uid) return;

    const uid = sanitizeId(firebaseUser.uid, 'op');
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);

    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }

    if (!snap.exists()) {
      const displayName =
        (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'OPERATOR')
          .trim()
          .slice(0, 100) || 'OPERATOR';
      const role: 'operator' | 'admin' =
        firebaseUser.email === ADMIN_EMAIL && firebaseUser.emailVerified ? 'admin' : 'operator';

      let savedTheme: ThemeMode = 'dark';
      let savedDisplay: DisplayMode = 'grid';
      try {
        if (localStorage.getItem('veda_theme') === 'light') savedTheme = 'light';
        if (localStorage.getItem('veda_display_mode') === 'stream') savedDisplay = 'stream';
      } catch {
        // Ignore storage errors
      }

      try {
        await setDoc(userRef, {
          uid,
          displayName,
          role,
          theme: savedTheme,
          displayMode: savedDisplay,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, userPath);
      }
    }

    ensuredUidRef.current = firebaseUser.uid;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (!firebaseUser) {
        ensuredUidRef.current = null;
        profilePromiseRef.current = null;
        setUserProfile(null);
        setCloudBookmarks({});
        setCloudCustomSources([]);
      } else {
        const promise = ensureUserProfile(firebaseUser).catch((err) => {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        });
        profilePromiseRef.current = promise;
      }
    });

    return () => unsubscribe();
  }, [ensureUserProfile]);

  useEffect(() => {
    if (!authReady || !user) return;

    const uid = sanitizeId(user.uid, 'op');
    const profilePath = `users/${uid}`;
    const bookmarksPath = `users/${uid}/bookmarks`;
    const customSourcesPath = `users/${uid}/customSources`;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const d = snapshot.data();
          setUserProfile({
            uid: String(d.uid || uid),
            displayName: String(d.displayName || 'OPERATOR'),
            role: d.role === 'admin' ? 'admin' : 'operator',
            theme: d.theme === 'light' ? 'light' : 'dark',
            displayMode: d.displayMode === 'stream' ? 'stream' : 'grid',
          });
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, profilePath);
        } catch (wrapped) {
          setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    const bookmarksQuery = query(
      collection(db, 'users', uid, 'bookmarks'),
      where('uid', '==', uid)
    );
    const unsubBookmarks = onSnapshot(
      bookmarksQuery,
      (snapshot) => {
        const next: Record<string, ArticleItem> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const hashId = String(d.hashId || docSnap.id);
          next[hashId] = {
            id: hashId,
            hashId,
            title: String(d.title || ''),
            summary: String(d.summary || ''),
            link: String(d.link || ''),
            sourceId: String(d.sourceId || ''),
            sourceName: String(d.sourceName || ''),
            category: String(d.category || 'world'),
            language: String(d.language || 'en'),
            publishedAt: String(d.publishedAt || new Date().toISOString()),
            fetchedAt: new Date().toISOString(),
          };
        });
        setCloudBookmarks(next);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, bookmarksPath);
        } catch (wrapped) {
          setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    const sourcesQuery = query(
      collection(db, 'users', uid, 'customSources'),
      where('uid', '==', uid)
    );
    const unsubSources = onSnapshot(
      sourcesQuery,
      (snapshot) => {
        const list: SourceItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: String(d.name || 'Custom Node'),
            url: String(d.url || ''),
            category: String(d.category || 'technology'),
            language: String(d.language || 'en'),
            description: String(d.description || ''),
            active: Boolean(d.active),
            lastStatus: 'PENDING',
            articleCount: 0,
            isCloudCustom: true,
          });
        });
        setCloudCustomSources(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, customSourcesPath);
        } catch (wrapped) {
          setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    return () => {
      unsubProfile();
      unsubBookmarks();
      unsubSources();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
        setAuthError(
          `Domain "${host}" belum terdaftar di Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setAuthError(err?.message || 'Gagal autentikasi dengan Google.');
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      setAuthError(err?.message || 'Gagal logout.');
    }
  }, []);

  const waitForProfileReady = useCallback(async (firebaseUser: User) => {
    if (profilePromiseRef.current) {
      await profilePromiseRef.current;
    }
    if (ensuredUidRef.current !== firebaseUser.uid) {
      await ensureUserProfile(firebaseUser);
    }
  }, [ensureUserProfile]);

  const toggleBookmarkInFirestore = useCallback(
    async (article: ArticleItem, currentlySaved: boolean) => {
      if (!user) return;
      await waitForProfileReady(user);

      const uid = sanitizeId(user.uid, 'op');
      const bookmarkId = sanitizeId(article.hashId || article.id, 'bm');
      const path = `users/${uid}/bookmarks/${bookmarkId}`;
      const docRef = doc(db, 'users', uid, 'bookmarks', bookmarkId);

      if (currentlySaved) {
        try {
          await deleteDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
        return;
      }

      const safeTitle = (article.title || 'Untitled Dispatch').trim().slice(0, 500) || 'Untitled Dispatch';
      const safeSummary = (article.summary || '').trim().slice(0, 1000);
      const safeLink = sanitizeHttpUrl(article.link, 'https://veda.local/dispatch');
      const safeSourceId = (article.sourceId || 'node').trim().slice(0, 128) || 'node';
      const safeSourceName = (article.sourceName || 'VEDA Node').trim().slice(0, 150) || 'VEDA Node';
      const safeCategory = sanitizeCategory(article.category);
      const safeLanguage = sanitizeLanguage(article.language);
      const safePublishedAt =
        (article.publishedAt || new Date().toISOString()).trim().slice(0, 64) ||
        new Date().toISOString();

      try {
        await setDoc(docRef, {
          uid,
          hashId: bookmarkId,
          title: safeTitle,
          summary: safeSummary,
          link: safeLink,
          sourceId: safeSourceId,
          sourceName: safeSourceName,
          category: safeCategory,
          language: safeLanguage,
          publishedAt: safePublishedAt,
          savedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [user, waitForProfileReady]
  );

  const addCustomSourceInFirestore = useCallback(
    async (input: {
      name: string;
      url: string;
      category: string;
      language: string;
      description?: string;
    }): Promise<SourceItem> => {
      if (!user) {
        throw new Error('Operator belum login.');
      }
      await waitForProfileReady(user);

      const uid = sanitizeId(user.uid, 'op');
      const sourceId = sanitizeId(
        `csrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        'csrc'
      );
      const path = `users/${uid}/customSources/${sourceId}`;

      const safeName = input.name.trim().slice(0, 120);
      if (!safeName) throw new Error('Nama sumber wajib diisi.');

      const safeUrl = sanitizeHttpUrl(input.url);
      const safeCategory = sanitizeCategory(input.category);
      const safeLanguage = sanitizeLanguage(input.language);
      const safeDescription = (input.description || '').trim().slice(0, 300);

      try {
        await setDoc(doc(db, 'users', uid, 'customSources', sourceId), {
          uid,
          name: safeName,
          url: safeUrl,
          category: safeCategory,
          language: safeLanguage,
          description: safeDescription,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }

      return {
        id: sourceId,
        name: safeName,
        url: safeUrl,
        category: safeCategory,
        language: safeLanguage,
        description: safeDescription,
        active: true,
        lastStatus: 'PENDING',
        articleCount: 0,
        isCloudCustom: true,
      };
    },
    [user, waitForProfileReady]
  );

  const toggleCustomSourceInFirestore = useCallback(
    async (sourceId: string, nextActive: boolean) => {
      if (!user) return;
      await waitForProfileReady(user);

      const uid = sanitizeId(user.uid, 'op');
      const safeSourceId = sanitizeId(sourceId, 'csrc');
      const path = `users/${uid}/customSources/${safeSourceId}`;

      try {
        await updateDoc(doc(db, 'users', uid, 'customSources', safeSourceId), {
          active: Boolean(nextActive),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user, waitForProfileReady]
  );

  const deleteCustomSourceInFirestore = useCallback(
    async (sourceId: string) => {
      if (!user) return;
      await waitForProfileReady(user);

      const uid = sanitizeId(user.uid, 'op');
      const safeSourceId = sanitizeId(sourceId, 'csrc');
      const path = `users/${uid}/customSources/${safeSourceId}`;

      try {
        await deleteDoc(doc(db, 'users', uid, 'customSources', safeSourceId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [user, waitForProfileReady]
  );

  const updatePreferencesInFirestore = useCallback(
    async (prefs: { theme?: ThemeMode; displayMode?: DisplayMode }) => {
      if (!user) return;
      await waitForProfileReady(user);

      const uid = sanitizeId(user.uid, 'op');
      const path = `users/${uid}`;
      const payload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (prefs.theme === 'dark' || prefs.theme === 'light') {
        payload.theme = prefs.theme;
      }
      if (prefs.displayMode === 'grid' || prefs.displayMode === 'stream') {
        payload.displayMode = prefs.displayMode;
      }

      try {
        await updateDoc(doc(db, 'users', uid), payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user, waitForProfileReady]
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        authLoading,
        authError,
        userProfile,
        cloudBookmarks,
        cloudCustomSources,
        signInWithGoogle,
        logout,
        toggleBookmarkInFirestore,
        addCustomSourceInFirestore,
        toggleCustomSourceInFirestore,
        deleteCustomSourceInFirestore,
        updatePreferencesInFirestore,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside a FirebaseProvider');
  }
  return ctx;
}
