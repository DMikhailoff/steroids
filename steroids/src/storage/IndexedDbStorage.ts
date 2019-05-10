import IStorage from './IStorage';
import { Observable, Observer, observable } from 'rxjs';
import Session from 'src/model/Session';
import Exercice from 'src/model/Exercice';
import Serie from 'src/model/Serie';
import * as uuid from 'uuid/v1';

export default class IndexedDbStorage implements IStorage {

    private version = 2;

    private upgradeFunctions: Map<number, ((db: IDBDatabase) => void)> = new Map<number, ((db: IDBDatabase) => void)>([
        [1, (db: IDBDatabase) => {
            db.createObjectStore('sessions', { autoIncrement: true });
        }],
        [2, (db: IDBDatabase) => {
            const exerciceTemplatesStore = db.createObjectStore('exerciceTemplates', { autoIncrement: true });
            this.createExerciceTemplate(exerciceTemplatesStore, 'Poulie');
            this.createExerciceTemplate(exerciceTemplatesStore, 'Développé couché');
            this.createExerciceTemplate(exerciceTemplatesStore, 'Tirage poulie haute');
            this.createExerciceTemplate(exerciceTemplatesStore, 'Butterfly');
        }]
    ]);

    open(): Observable<IDBDatabase> {
        return Observable.create((observer: Observer<IDBDatabase>) => {
            const request = window.indexedDB.open('steroids', this.version);
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = request.result;
                this.upgrade(event.oldVersion, event.newVersion, db);
            };
            request.onsuccess = _ => {
                observer.next(request.result);
                observer.complete();
            };
            request.onerror = _ => {
                console.error(request.error);
                observer.error(request.error);
            };
        });
    }

    upgrade(oldVersion: number, newVersion: number, db: IDBDatabase) {
        while (oldVersion < newVersion) {
            oldVersion++;
            this.upgradeFunctions.get(oldVersion)(db);
        }
    }

    getAllSessions(): Observable<Session[]> {
        return Observable.create((observer: Observer<Session[]>) => {
            this.open().subscribe((db: IDBDatabase) => {
                const transaction = db.transaction(['sessions'], 'readonly');
                const sessionsObjectStore = transaction.objectStore('sessions');
                const request = sessionsObjectStore.getAll();
                request.onsuccess = _ => {
                    const sessions = request.result as Session[];
                    observer.next(sessions);
                    observer.complete();
                };
                request.onerror = _ => {
                    console.error(request.error);
                    observer.error(request.error);
                };
            });
        });
    }

    getSession(id: string): Observable<Session> {
        return Observable.create((observer: Observer<Session>) => {
            this.open().subscribe((db: IDBDatabase) => {
                const transaction = db.transaction(['sessions'], 'readwrite');
                const sessionsStore = transaction.objectStore('sessions');
                const request = sessionsStore.get(id);
                request.onsuccess = _ => {
                    observer.next(request.result);
                    observer.complete();
                };
                request.onerror = _ => {
                    console.error(request.error);
                    observer.error(request.error);
                };
            });
        });
    }

    createSession(session: Session): Observable<void> {
        return Observable.create((observer: Observer<void>) => {
            this.open().subscribe((db: IDBDatabase) => {
                session.id = uuid();
                const transaction = db.transaction(['sessions'], 'readwrite');
                const sessionsStore = transaction.objectStore('sessions');
                const request = sessionsStore.add(session, session.id);
                request.onsuccess = _ => {
                    observer.complete();
                };
                request.onerror = _ => {
                    console.error(request.error);
                    observer.error(request.error);
                };
            });
        });
    }

    addExercice(exercice: Exercice, session: Session): Observable<void> {
        return Observable.create((observer: Observer<void>) => {
            this.getSession(session.id).subscribe(dbSession => {
                exercice.id = uuid();
                dbSession.exercices.push(exercice);
                this.open().subscribe(db => {
                    const store = db.transaction(['sessions'], 'readwrite').objectStore('sessions');
                    const request = store.put(dbSession, dbSession.id);
                    request.onsuccess = _ => {
                        observer.complete();
                    };
                    request.onerror = _ => {
                        observer.error(request.error);
                    };
                });
            });
        });
    }

    getExercice(id: string): Observable<Exercice> {
        return Observable.create((observer: Observer<Exercice>) => {
            this.getAllSessions().subscribe(sessions => {
                for (const session of sessions) {
                    for (const exercice of session.exercices) {
                        if (exercice.id === id) {
                            observer.next(exercice);
                            observer.complete();
                            return;
                        }
                    }
                }
                observer.complete();
            });
        });
    }

    addSerie(serie: Serie, exercice: Exercice): Observable<void> {
        throw new Error("Method not implemented.");
    }

    getAllExerciceTemplates(): Observable<Exercice[]> {
        return Observable.create((observer: Observer<Exercice[]>) => {
            this.open().subscribe((db: IDBDatabase) => {
                const transaction = db.transaction(['exerciceTemplates'], 'readonly');
                const exerciceTemplatesStore = transaction.objectStore('exerciceTemplates');
                const request = exerciceTemplatesStore.getAll();
                request.onsuccess = _ => {
                    const templates = request.result;
                    observer.next(templates);
                    observer.complete();
                };
                request.onerror = _ => {
                    console.error(request.error);
                    observer.error(request.error);
                };
            });
        });
    }

    createExerciceTemplate(store: IDBObjectStore, name: string) {
        const id = uuid();
        const exercice = new Exercice(id, name);
        const request = store.add(exercice, id);
        request.onerror = _ => {
            console.error(request.error);
        };
    }
}