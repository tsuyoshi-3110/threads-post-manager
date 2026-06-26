import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(getFirebaseAuth(), email, password);

export const signInWithGoogle = () =>
  signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());

export const logOut = () => signOut(getFirebaseAuth());

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(getFirebaseAuth(), callback);
