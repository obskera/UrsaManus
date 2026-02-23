//Signal bus handles signaling//

//---// usage example //---//
//
// We store the returned off() function to unsubscribe in const unsubscribe.
//
//      const unsubscribe = signalBus.on<number>("healthChanged", (hp) => {
//          console.log("hp:", hp)
//      })
//
// Now we can use it to emit and call the callbacks attached
//      signalBus.emit("healthChanged", 50)
//
// Or call unsubscribe() to remove the signal
//      unsubscribe()
//
// e.g. if you try to call it after unsubscribing
//      signalBus.emit("healthChanged", 25) // nothing logs
//
//---// Another example, safety in components //---//
//  useEffect(() => {
//      const unsubscribe = signalBus.on("healthChanged", (hp) => {
//          setHp(hp)
//      })
//
//      return unsubscribe
//  }, [])
//
// This runs on mount, and then cleans the signal subscription on component dismount
//---//

export type Unsubscribe = () => void;
export type Handler<T = void> = (payload: T) => void;

class SignalBus {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    private signals: Record<string, Function[]> = {};

    on<T = void>(signal: string, handler: Handler<T>): Unsubscribe {
        if (!this.signals[signal]) this.signals[signal] = [];
        this.signals[signal].push(handler);

        return () => this.off(signal, handler);
    }

    off<T = void>(signal: string, handler: Handler<T>) {
        const list = this.signals[signal];
        if (!list) return;

        this.signals[signal] = list.filter((fn) => fn !== handler);

        if (this.signals[signal].length === 0) delete this.signals[signal];
    }

    emit<T = void>(signal: string, payload: T) {
        const list = this.signals[signal];
        if (!list) return;

        for (const fn of list) (fn as Handler<T>)(payload);
    }

    clear(signal?: string) {
        if (signal) {
            delete this.signals[signal];
            return;
        }

        this.signals = {};
    }
}

export const signalBus = new SignalBus();
