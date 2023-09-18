'use strict';

// tslint:disable:ban-types
function isArrayLike(x) {
    return Array.isArray(x) || ArrayBuffer.isView(x);
}
function isEnumerable(x) {
    return x != null && typeof x.GetEnumerator === "function";
}
function isComparable(x) {
    return x != null && typeof x.CompareTo === "function";
}
function isEquatable(x) {
    return x != null && typeof x.Equals === "function";
}
function isHashable(x) {
    return x != null && typeof x.GetHashCode === "function";
}
function isDisposable(x) {
    return x != null && typeof x.Dispose === "function";
}
function disposeSafe(x) {
    if (isDisposable(x)) {
        x.Dispose();
    }
}
function defaultOf() {
    return null;
}
function sameConstructor(x, y) {
    return Object.getPrototypeOf(x)?.constructor === Object.getPrototypeOf(y)?.constructor;
}
class Enumerator {
    constructor(iter) {
        this.iter = iter;
        this.current = defaultOf();
    }
    ["System.Collections.Generic.IEnumerator`1.get_Current"]() {
        return this.current;
    }
    ["System.Collections.IEnumerator.get_Current"]() {
        return this.current;
    }
    ["System.Collections.IEnumerator.MoveNext"]() {
        const cur = this.iter.next();
        this.current = cur.value;
        return !cur.done;
    }
    ["System.Collections.IEnumerator.Reset"]() {
        throw new Error("JS iterators cannot be reset");
    }
    Dispose() {
        return;
    }
}
function getEnumerator(e) {
    if (isEnumerable(e)) {
        return e.GetEnumerator();
    }
    else {
        return new Enumerator(e[Symbol.iterator]());
    }
}
function toIterator(en) {
    return {
        next() {
            const hasNext = en["System.Collections.IEnumerator.MoveNext"]();
            const current = hasNext ? en["System.Collections.Generic.IEnumerator`1.get_Current"]() : undefined;
            return { done: !hasNext, value: current };
        },
    };
}
function padWithZeros(i, length) {
    let str = i.toString(10);
    while (str.length < length) {
        str = "0" + str;
    }
    return str;
}
function dateOffset(date) {
    const date1 = date;
    return typeof date1.offset === "number"
        ? date1.offset
        : (date.kind === 1 /* DateKind.UTC */
            ? 0 : date.getTimezoneOffset() * -60000);
}
function int32ToString(i, radix) {
    i = i < 0 && radix != null && radix !== 10 ? 0xFFFFFFFF + i + 1 : i;
    return i.toString(radix);
}
class ObjectRef {
    static id(o) {
        if (!ObjectRef.idMap.has(o)) {
            ObjectRef.idMap.set(o, ++ObjectRef.count);
        }
        return ObjectRef.idMap.get(o);
    }
}
ObjectRef.idMap = new WeakMap();
ObjectRef.count = 0;
function stringHash(s) {
    let i = 0;
    let h = 5381;
    const len = s.length;
    while (i < len) {
        h = (h * 33) ^ s.charCodeAt(i++);
    }
    return h;
}
function numberHash(x) {
    return x * 2654435761 | 0;
}
function bigintHash(x) {
    return stringHash(x.toString(32));
}
// From https://stackoverflow.com/a/37449594
function combineHashCodes(hashes) {
    let h1 = 0;
    const len = hashes.length;
    for (let i = 0; i < len; i++) {
        const h2 = hashes[i];
        h1 = ((h1 << 5) + h1) ^ h2;
    }
    return h1;
}
function dateHash(x) {
    return x.getTime();
}
function arrayHash(x) {
    const len = x.length;
    const hashes = new Array(len);
    for (let i = 0; i < len; i++) {
        hashes[i] = structuralHash(x[i]);
    }
    return combineHashCodes(hashes);
}
function structuralHash(x) {
    if (x == null) {
        return 0;
    }
    switch (typeof x) {
        case "boolean":
            return x ? 1 : 0;
        case "number":
            return numberHash(x);
        case "bigint":
            return bigintHash(x);
        case "string":
            return stringHash(x);
        default: {
            if (isHashable(x)) {
                return x.GetHashCode();
            }
            else if (isArrayLike(x)) {
                return arrayHash(x);
            }
            else if (x instanceof Date) {
                return dateHash(x);
            }
            else if (Object.getPrototypeOf(x)?.constructor === Object) {
                // TODO: check call-stack to prevent cyclic objects?
                const hashes = Object.values(x).map((v) => structuralHash(v));
                return combineHashCodes(hashes);
            }
            else {
                // Classes don't implement GetHashCode by default, but must use identity hashing
                return numberHash(ObjectRef.id(x));
                // return stringHash(String(x));
            }
        }
    }
}
function equalArraysWith(x, y, eq) {
    if (x == null) {
        return y == null;
    }
    if (y == null) {
        return false;
    }
    if (x.length !== y.length) {
        return false;
    }
    for (let i = 0; i < x.length; i++) {
        if (!eq(x[i], y[i])) {
            return false;
        }
    }
    return true;
}
function equalArrays(x, y) {
    return equalArraysWith(x, y, equals$1);
}
function equalObjects(x, y) {
    const xKeys = Object.keys(x);
    const yKeys = Object.keys(y);
    if (xKeys.length !== yKeys.length) {
        return false;
    }
    xKeys.sort();
    yKeys.sort();
    for (let i = 0; i < xKeys.length; i++) {
        if (xKeys[i] !== yKeys[i] || !equals$1(x[xKeys[i]], y[yKeys[i]])) {
            return false;
        }
    }
    return true;
}
function equals$1(x, y) {
    if (x === y) {
        return true;
    }
    else if (x == null) {
        return y == null;
    }
    else if (y == null) {
        return false;
    }
    else if (isEquatable(x)) {
        return x.Equals(y);
    }
    else if (isArrayLike(x)) {
        return isArrayLike(y) && equalArrays(x, y);
    }
    else if (typeof x !== "object") {
        return false;
    }
    else if (x instanceof Date) {
        return (y instanceof Date) && compareDates(x, y) === 0;
    }
    else {
        return Object.getPrototypeOf(x)?.constructor === Object && equalObjects(x, y);
    }
}
function compareDates(x, y) {
    let xtime;
    let ytime;
    // DateTimeOffset and DateTime deals with equality differently.
    if ("offset" in x && "offset" in y) {
        xtime = x.getTime();
        ytime = y.getTime();
    }
    else {
        xtime = x.getTime() + dateOffset(x);
        ytime = y.getTime() + dateOffset(y);
    }
    return xtime === ytime ? 0 : (xtime < ytime ? -1 : 1);
}
function comparePrimitives(x, y) {
    return x === y ? 0 : (x < y ? -1 : 1);
}
function compareArraysWith(x, y, comp) {
    if (x == null) {
        return y == null ? 0 : 1;
    }
    if (y == null) {
        return -1;
    }
    if (x.length !== y.length) {
        return x.length < y.length ? -1 : 1;
    }
    for (let i = 0, j = 0; i < x.length; i++) {
        j = comp(x[i], y[i]);
        if (j !== 0) {
            return j;
        }
    }
    return 0;
}
function compareArrays(x, y) {
    return compareArraysWith(x, y, compare$1);
}
function compareObjects(x, y) {
    const xKeys = Object.keys(x);
    const yKeys = Object.keys(y);
    if (xKeys.length !== yKeys.length) {
        return xKeys.length < yKeys.length ? -1 : 1;
    }
    xKeys.sort();
    yKeys.sort();
    for (let i = 0, j = 0; i < xKeys.length; i++) {
        const key = xKeys[i];
        if (key !== yKeys[i]) {
            return key < yKeys[i] ? -1 : 1;
        }
        else {
            j = compare$1(x[key], y[key]);
            if (j !== 0) {
                return j;
            }
        }
    }
    return 0;
}
function compare$1(x, y) {
    if (x === y) {
        return 0;
    }
    else if (x == null) {
        return y == null ? 0 : -1;
    }
    else if (y == null) {
        return 1;
    }
    else if (isComparable(x)) {
        return x.CompareTo(y);
    }
    else if (isArrayLike(x)) {
        return isArrayLike(y) ? compareArrays(x, y) : -1;
    }
    else if (typeof x !== "object") {
        return x < y ? -1 : 1;
    }
    else if (x instanceof Date) {
        return y instanceof Date ? compareDates(x, y) : -1;
    }
    else {
        return Object.getPrototypeOf(x)?.constructor === Object ? compareObjects(x, y) : -1;
    }
}
const curried = new WeakMap();
function uncurry2(f) {
    if (f == null) {
        return null;
    }
    const f2 = (a1, a2) => f(a1)(a2);
    curried.set(f2, f);
    return f2;
}
function curry3(f) {
    return curried.get(f)
        ?? ((a1) => (a2) => (a3) => f(a1, a2, a3));
}

function seqToString(self) {
    let count = 0;
    let str = "[";
    for (const x of self) {
        if (count === 0) {
            str += toString$1(x);
        }
        else if (count === 100) {
            str += "; ...";
            break;
        }
        else {
            str += "; " + toString$1(x);
        }
        count++;
    }
    return str + "]";
}
function toString$1(x, callStack = 0) {
    if (x != null && typeof x === "object") {
        if (typeof x.toString === "function") {
            return x.toString();
        }
        else if (Symbol.iterator in x) {
            return seqToString(x);
        }
        else { // TODO: Date?
            const cons = Object.getPrototypeOf(x)?.constructor;
            return cons === Object && callStack < 10
                // Same format as recordToString
                ? "{ " + Object.entries(x).map(([k, v]) => k + " = " + toString$1(v, callStack + 1)).join("\n  ") + " }"
                : cons?.name ?? "";
        }
    }
    return String(x);
}
function unionToString(name, fields) {
    if (fields.length === 0) {
        return name;
    }
    else {
        let fieldStr;
        let withParens = true;
        if (fields.length === 1) {
            fieldStr = toString$1(fields[0]);
            withParens = fieldStr.indexOf(" ") >= 0;
        }
        else {
            fieldStr = fields.map((x) => toString$1(x)).join(", ");
        }
        return name + (withParens ? " (" : " ") + fieldStr + (withParens ? ")" : "");
    }
}
class Union {
    get name() {
        return this.cases()[this.tag];
    }
    toJSON() {
        return this.fields.length === 0 ? this.name : [this.name].concat(this.fields);
    }
    toString() {
        return unionToString(this.name, this.fields);
    }
    GetHashCode() {
        const hashes = this.fields.map((x) => structuralHash(x));
        hashes.splice(0, 0, numberHash(this.tag));
        return combineHashCodes(hashes);
    }
    Equals(other) {
        if (this === other) {
            return true;
        }
        else if (!sameConstructor(this, other)) {
            return false;
        }
        else if (this.tag === other.tag) {
            return equalArrays(this.fields, other.fields);
        }
        else {
            return false;
        }
    }
    CompareTo(other) {
        if (this === other) {
            return 0;
        }
        else if (!sameConstructor(this, other)) {
            return -1;
        }
        else if (this.tag === other.tag) {
            return compareArrays(this.fields, other.fields);
        }
        else {
            return this.tag < other.tag ? -1 : 1;
        }
    }
}
function recordToJSON(self) {
    const o = {};
    const keys = Object.keys(self);
    for (let i = 0; i < keys.length; i++) {
        o[keys[i]] = self[keys[i]];
    }
    return o;
}
function recordToString(self) {
    return "{ " + Object.entries(self).map(([k, v]) => k + " = " + toString$1(v)).join("\n  ") + " }";
}
function recordGetHashCode(self) {
    const hashes = Object.values(self).map((v) => structuralHash(v));
    return combineHashCodes(hashes);
}
function recordEquals(self, other) {
    if (self === other) {
        return true;
    }
    else if (!sameConstructor(self, other)) {
        return false;
    }
    else {
        const thisNames = Object.keys(self);
        for (let i = 0; i < thisNames.length; i++) {
            if (!equals$1(self[thisNames[i]], other[thisNames[i]])) {
                return false;
            }
        }
        return true;
    }
}
function recordCompareTo(self, other) {
    if (self === other) {
        return 0;
    }
    else if (!sameConstructor(self, other)) {
        return -1;
    }
    else {
        const thisNames = Object.keys(self);
        for (let i = 0; i < thisNames.length; i++) {
            const result = compare$1(self[thisNames[i]], other[thisNames[i]]);
            if (result !== 0) {
                return result;
            }
        }
        return 0;
    }
}
class Record {
    toJSON() { return recordToJSON(this); }
    toString() { return recordToString(this); }
    GetHashCode() { return recordGetHashCode(this); }
    Equals(other) { return recordEquals(this, other); }
    CompareTo(other) { return recordCompareTo(this, other); }
}
class FSharpRef {
    get contents() {
        return this.getter();
    }
    set contents(v) {
        this.setter(v);
    }
    constructor(contentsOrGetter, setter) {
        if (typeof setter === "function") {
            this.getter = contentsOrGetter;
            this.setter = setter;
        }
        else {
            this.getter = () => contentsOrGetter;
            this.setter = (v) => { contentsOrGetter = v; };
        }
    }
}

// Adapted from https://github.com/MikeMcl/big.js/blob/0f94dc9110d55c4f324a47ba6a2e832ce23ac589/big.mjs
/* tslint:disable */
var P = {};
/*
 *  big.js v6.0.3
 *  A small, fast, easy-to-use library for arbitrary-precision decimal arithmetic.
 *  Copyright (c) 2020 Michael Mclaughlin
 *  https://github.com/MikeMcl/big.js/LICENCE.md
 */
/************************************** EDITABLE DEFAULTS *****************************************/
// The default values below must be integers within the stated ranges.
/*
 * The maximum number of decimal places (DP) of the results of operations involving division:
 * div and sqrt, and pow with negative exponents.
 */
var DP = 28, // 0 to MAX_DP
/*
 * The rounding mode (RM) used when rounding to the above decimal places.
 *
 *  0  Towards zero (i.e. truncate, no rounding).       (ROUND_DOWN)
 *  1  To nearest neighbour. If equidistant, round up.  (ROUND_HALF_UP)
 *  2  To nearest neighbour. If equidistant, to even.   (ROUND_HALF_EVEN)
 *  3  Away from zero.                                  (ROUND_UP)
 */
RM = 1, // 0, 1, 2 or 3
// The maximum value of DP and Big.DP.
MAX_DP = 1E6, // 0 to 1000000
// The maximum magnitude of the exponent argument to the pow method.
MAX_POWER = 1E6, // 1 to 1000000
/*
 * The negative exponent (NE) at and beneath which toString returns exponential notation.
 * (JavaScript numbers: -7)
 * -1000000 is the minimum recommended exponent value of a Big.
 */
NE = -29, // 0 to -1000000
/*
 * The positive exponent (PE) at and above which toString returns exponential notation.
 * (JavaScript numbers: 21)
 * 1000000 is the maximum recommended exponent value of a Big, but this limit is not enforced.
 */
PE = 29, // 0 to 1000000
/*
 * When true, an error will be thrown if a primitive number is passed to the Big constructor,
 * or if valueOf is called, or if toNumber is called on a Big which cannot be converted to a
 * primitive number without a loss of precision.
 */
STRICT = false, // true or false
/**************************************************************************************************/
// Error messages.
NAME = '[big.js] ', INVALID = NAME + 'Invalid ', INVALID_DP = INVALID + 'decimal places', INVALID_RM = INVALID + 'rounding mode', DIV_BY_ZERO = NAME + 'Division by zero', UNDEFINED = void 0, NUMERIC = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
/*
 * Create and return a Big constructor.
 */
function _Big_() {
    /*
     * The Big constructor and exported function.
     * Create and return a new instance of a Big number object.
     *
     * n {number|string|Big} A numeric value.
     */
    function Big(n) {
        var x = this;
        // Enable constructor usage without new.
        if (!(x instanceof Big))
            return n === UNDEFINED ? _Big_() : new Big(n);
        // Duplicate.
        if (n instanceof Big) {
            x.s = n.s;
            x.e = n.e;
            x.c = n.c.slice();
            normalize(x);
        }
        else {
            if (typeof n !== 'string') {
                if (Big.strict === true) {
                    throw TypeError(INVALID + 'number');
                }
                // Minus zero?
                n = n === 0 && 1 / n < 0 ? '-0' : String(n);
            }
            parse$1(x, n);
        }
        // Retain a reference to this Big constructor.
        // Shadow Big.prototype.constructor which points to Object.
        x.constructor = Big;
    }
    Big.prototype = P;
    Big.DP = DP;
    Big.RM = RM;
    Big.NE = NE;
    Big.PE = PE;
    Big.strict = STRICT;
    return Big;
}
function normalize(x) {
    // x = round(x, DP, 0);
    if (x.c.length > 1 && !x.c[0]) {
        let i = x.c.findIndex(x => x);
        x.c = x.c.slice(i);
        x.e = x.e - i;
    }
}
/*
 * Parse the number or string value passed to a Big constructor.
 *
 * x {Big} A Big number instance.
 * n {number|string} A numeric value.
 */
function parse$1(x, n) {
    var e, i, nl;
    if (!NUMERIC.test(n)) {
        throw Error(INVALID + 'number');
    }
    // Determine sign.
    x.s = n.charAt(0) == '-' ? (n = n.slice(1), -1) : 1;
    // Decimal point?
    if ((e = n.indexOf('.')) > -1)
        n = n.replace('.', '');
    // Exponential form?
    if ((i = n.search(/e/i)) > 0) {
        // Determine exponent.
        if (e < 0)
            e = i;
        e += +n.slice(i + 1);
        n = n.substring(0, i);
    }
    else if (e < 0) {
        // Integer.
        e = n.length;
    }
    nl = n.length;
    // Determine leading zeros before decimal point.
    for (i = 0; i < e && i < nl && n.charAt(i) == '0';)
        ++i;
    // original version (ignores decimal point).
    // // Determine leading zeros.
    // for (i = 0; i < nl && n.charAt(i) == '0';) ++i;
    if (i == nl) {
        // Zero.
        x.c = [x.e = 0];
    }
    else {
        x.e = e - i - 1;
        x.c = [];
        // Convert string to array of digits without leading zeros
        for (e = 0; i < nl;)
            x.c[e++] = +n.charAt(i++);
        // older version (doesn't keep trailing zeroes).
        // // Determine trailing zeros.
        // for (; nl > 0 && n.charAt(--nl) == '0';);
        // // Convert string to array of digits without leading/trailing zeros.
        // for (e = 0; i <= nl;) x.c[e++] = +n.charAt(i++);
    }
    x = round(x, Big.DP + 1, Big.RM);
    return x;
}
/*
 * Round Big x to a maximum of sd significant digits using rounding mode rm.
 *
 * x {Big} The Big to round.
 * sd {number} Significant digits: integer, 0 to MAX_DP inclusive.
 * rm {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
 * [more] {boolean} Whether the result of division was truncated.
 */
function round(x, sd, rm, more) {
    var xc = x.c;
    if (rm === UNDEFINED)
        rm = Big.RM;
    if (rm !== 0 && rm !== 1 && rm !== 2 && rm !== 3) {
        throw Error(INVALID_RM);
    }
    if (sd < 1) {
        more =
            rm === 3 && (more || !!xc[0]) || sd === 0 && (rm === 1 && xc[0] >= 5 ||
                rm === 2 && (xc[0] > 5 || xc[0] === 5 && (more || xc[1] !== UNDEFINED)));
        xc.length = 1;
        if (more) {
            // 1, 0.1, 0.01, 0.001, 0.0001 etc.
            x.e = x.e - sd + 1;
            xc[0] = 1;
        }
        else {
            // Zero.
            xc[0] = x.e = 0;
        }
    }
    else if (sd < xc.length) {
        // xc[sd] is the digit after the digit that may be rounded up.
        const isZero = xc.findIndex((xci, idx) => idx >= sd && xci > 0) < 0;
        more =
            rm === 1 && xc[sd] >= 5 ||
                rm === 2 && (xc[sd] > 5 || xc[sd] === 5 &&
                    (more || xc[sd + 1] !== UNDEFINED || xc[sd - 1] & 1)) ||
                rm === 3 && (more || !isZero);
        // Remove any digits after the required precision.
        xc.length = sd--;
        // Round up?
        if (more) {
            // Rounding up may mean the previous digit has to be rounded up.
            for (; ++xc[sd] > 9;) {
                xc[sd] = 0;
                if (!sd--) {
                    ++x.e;
                    xc.unshift(1);
                }
            }
        }
        // Remove trailing zeros.
        for (sd = xc.length; !xc[--sd];)
            xc.pop();
    }
    return x;
}
/*
 * Return a string representing the value of Big x in normal or exponential notation.
 * Handles P.toExponential, P.toFixed, P.toJSON, P.toPrecision, P.toString and P.valueOf.
 */
function stringify(x, doExponential, isNonzero) {
    var e = x.e, s = x.c.join(''), n = s.length;
    // Exponential notation?
    if (doExponential) {
        s = s.charAt(0) + (n > 1 ? '.' + s.slice(1) : '') + (e < 0 ? 'e' : 'e+') + e;
        // Normal notation.
    }
    else if (e < 0) {
        for (; ++e;)
            s = '0' + s;
        s = '0.' + s;
    }
    else if (e > 0) {
        if (++e > n) {
            for (e -= n; e--;)
                s += '0';
        }
        else if (e < n) {
            s = s.slice(0, e) + '.' + s.slice(e);
        }
    }
    else if (n > 1) {
        s = s.charAt(0) + '.' + s.slice(1);
    }
    return x.s < 0 && isNonzero ? '-' + s : s;
}
// Prototype/instance methods
/*
 * Return a new Big whose value is the absolute value of this Big.
 */
P.abs = function () {
    var x = new this.constructor(this);
    x.s = 1;
    return x;
};
/*
 * Return 1 if the value of this Big is greater than the value of Big y,
 *       -1 if the value of this Big is less than the value of Big y, or
 *        0 if they have the same value.
 */
P.cmp = function (y) {
    var isneg, Big = this.constructor, x = new Big(this), y = new Big(y), xc = x.c, yc = y.c, i = x.s, j = y.s, k = x.e, l = y.e;
    // Either zero?
    if (!xc[0] || !yc[0])
        return !xc[0] ? !yc[0] ? 0 : -j : i;
    // Signs differ?
    if (i != j)
        return i;
    isneg = i < 0;
    // Compare exponents.
    if (k != l)
        return k > l ^ isneg ? 1 : -1;
    // Compare digit by digit.
    j = Math.max(xc.length, yc.length);
    for (i = 0; i < j; i++) {
        k = i < xc.length ? xc[i] : 0;
        l = i < yc.length ? yc[i] : 0;
        if (k != l)
            return k > l ^ isneg ? 1 : -1;
    }
    return 0;
    // original version (doesn't compare well trailing zeroes, e.g. 1.0 with 1.00)
    // j = (k = xc.length) < (l = yc.length) ? k : l;
    // // Compare digit by digit.
    // for (i = -1; ++i < j;) {
    //   if (xc[i] != yc[i]) return xc[i] > yc[i] ^ isneg ? 1 : -1;
    // }
    // // Compare lengths.
    // return k == l ? 0 : k > l ^ isneg ? 1 : -1;
};
/*
 * Return a new Big whose value is the value of this Big divided by the value of Big y, rounded,
 * if necessary, to a maximum of Big.DP decimal places using rounding mode Big.RM.
 */
P.div = function (y) {
    var Big = this.constructor, x = new Big(this), y = new Big(y), a = x.c, // dividend
    b = y.c, // divisor
    k = x.s == y.s ? 1 : -1, dp = Big.DP;
    if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
        throw Error(INVALID_DP);
    }
    // Divisor is zero?
    if (!b[0]) {
        throw Error(DIV_BY_ZERO);
    }
    // Dividend is 0? Return +-0.
    if (!a[0]) {
        y.s = k;
        y.c = [y.e = 0];
        return y;
    }
    var bl, bt, n, cmp, ri, bz = b.slice(), ai = bl = b.length, al = a.length, r = a.slice(0, bl), // remainder
    rl = r.length, q = y, // quotient
    qc = q.c = [], qi = 0, p = dp + (q.e = x.e - y.e) + 1; // precision of the result
    q.s = k;
    k = p < 0 ? 0 : p;
    // Create version of divisor with leading zero.
    bz.unshift(0);
    // Add zeros to make remainder as long as divisor.
    for (; rl++ < bl;)
        r.push(0);
    do {
        // n is how many times the divisor goes into current remainder.
        for (n = 0; n < 10; n++) {
            // Compare divisor and remainder.
            if (bl != (rl = r.length)) {
                cmp = bl > rl ? 1 : -1;
            }
            else {
                for (ri = -1, cmp = 0; ++ri < bl;) {
                    if (b[ri] != r[ri]) {
                        cmp = b[ri] > r[ri] ? 1 : -1;
                        break;
                    }
                }
            }
            // If divisor < remainder, subtract divisor from remainder.
            if (cmp < 0) {
                // Remainder can't be more than 1 digit longer than divisor.
                // Equalise lengths using divisor with extra leading zero?
                for (bt = rl == bl ? b : bz; rl;) {
                    if (r[--rl] < bt[rl]) {
                        ri = rl;
                        for (; ri && !r[--ri];)
                            r[ri] = 9;
                        --r[ri];
                        r[rl] += 10;
                    }
                    r[rl] -= bt[rl];
                }
                for (; !r[0];)
                    r.shift();
            }
            else {
                break;
            }
        }
        // Add the digit n to the result array.
        qc[qi++] = cmp ? n : ++n;
        // Update the remainder.
        if (r[0] && cmp)
            r[rl] = a[ai] || 0;
        else
            r = [a[ai]];
    } while ((ai++ < al || r[0] !== UNDEFINED) && k--);
    // Leading zero? Do not remove if result is simply zero (qi == 1).
    if (!qc[0] && qi != 1) {
        // There can't be more than one zero.
        qc.shift();
        q.e--;
        p--;
    }
    // Round?
    if (qi > p)
        round(q, p, Big.RM, r[0] !== UNDEFINED);
    return q;
};
/*
 * Return true if the value of this Big is equal to the value of Big y, otherwise return false.
 */
P.eq = function (y) {
    return this.cmp(y) === 0;
};
/*
 * Return true if the value of this Big is greater than the value of Big y, otherwise return
 * false.
 */
P.gt = function (y) {
    return this.cmp(y) > 0;
};
/*
 * Return true if the value of this Big is greater than or equal to the value of Big y, otherwise
 * return false.
 */
P.gte = function (y) {
    return this.cmp(y) > -1;
};
/*
 * Return true if the value of this Big is less than the value of Big y, otherwise return false.
 */
P.lt = function (y) {
    return this.cmp(y) < 0;
};
/*
 * Return true if the value of this Big is less than or equal to the value of Big y, otherwise
 * return false.
 */
P.lte = function (y) {
    return this.cmp(y) < 1;
};
/*
 * Return a new Big whose value is the value of this Big minus the value of Big y.
 */
P.minus = P.sub = function (y) {
    var i, j, t, xlty, Big = this.constructor, x = new Big(this), y = new Big(y), a = x.s, b = y.s;
    // Signs differ?
    if (a != b) {
        y.s = -b;
        return x.plus(y);
    }
    var xc = x.c.slice(), xe = x.e, yc = y.c, ye = y.e;
    // Either zero?
    if (!xc[0] || !yc[0]) {
        if (yc[0]) {
            y.s = -b;
        }
        else if (xc[0]) {
            y = new Big(x);
        }
        else {
            y.s = 1;
        }
        return y;
    }
    // Determine which is the bigger number. Prepend zeros to equalise exponents.
    if (a = xe - ye) {
        if (xlty = a < 0) {
            a = -a;
            t = xc;
        }
        else {
            ye = xe;
            t = yc;
        }
        t.reverse();
        for (b = a; b--;)
            t.push(0);
        t.reverse();
    }
    else {
        // Exponents equal. Check digit by digit.
        j = ((xlty = xc.length < yc.length) ? xc : yc).length;
        for (a = b = 0; b < j; b++) {
            if (xc[b] != yc[b]) {
                xlty = xc[b] < yc[b];
                break;
            }
        }
    }
    // x < y? Point xc to the array of the bigger number.
    if (xlty) {
        t = xc;
        xc = yc;
        yc = t;
        y.s = -y.s;
    }
    /*
     * Append zeros to xc if shorter. No need to add zeros to yc if shorter as subtraction only
     * needs to start at yc.length.
     */
    if ((b = (j = yc.length) - (i = xc.length)) > 0)
        for (; b--;)
            xc[i++] = 0;
    // Subtract yc from xc.
    for (b = i; j > a;) {
        if (xc[--j] < yc[j]) {
            for (i = j; i && !xc[--i];)
                xc[i] = 9;
            --xc[i];
            xc[j] += 10;
        }
        xc[j] -= yc[j];
    }
    // Remove trailing zeros.
    for (; xc[--b] === 0;)
        xc.pop();
    // Remove leading zeros and adjust exponent accordingly.
    for (; xc[0] === 0;) {
        xc.shift();
        --ye;
    }
    if (!xc[0]) {
        // n - n = +0
        y.s = 1;
        // Result must be zero.
        xc = [ye = 0];
    }
    y.c = xc;
    y.e = ye;
    return y;
};
/*
 * Return a new Big whose value is the value of this Big modulo the value of Big y.
 */
P.mod = function (y) {
    var ygtx, Big = this.constructor, x = new Big(this), y = new Big(y), a = x.s, b = y.s;
    if (!y.c[0]) {
        throw Error(DIV_BY_ZERO);
    }
    x.s = y.s = 1;
    ygtx = y.cmp(x) == 1;
    x.s = a;
    y.s = b;
    if (ygtx)
        return new Big(x);
    a = Big.DP;
    b = Big.RM;
    Big.DP = Big.RM = 0;
    x = x.div(y);
    Big.DP = a;
    Big.RM = b;
    return this.minus(x.times(y));
};
/*
 * Return a new Big whose value is the value of this Big plus the value of Big y.
 */
P.plus = P.add = function (y) {
    var e, k, t, Big = this.constructor, x = new Big(this), y = new Big(y);
    // Signs differ?
    if (x.s != y.s) {
        y.s = -y.s;
        return x.minus(y);
    }
    var xe = x.e, xc = x.c, ye = y.e, yc = y.c;
    // Either zero?
    if (!xc[0] || !yc[0]) {
        if (!yc[0]) {
            if (xc[0]) {
                y = new Big(x);
            }
            else {
                y.s = x.s;
            }
        }
        return y;
    }
    xc = xc.slice();
    // Prepend zeros to equalise exponents.
    // Note: reverse faster than unshifts.
    if (e = xe - ye) {
        if (e > 0) {
            ye = xe;
            t = yc;
        }
        else {
            e = -e;
            t = xc;
        }
        t.reverse();
        for (; e--;)
            t.push(0);
        t.reverse();
    }
    // Point xc to the longer array.
    if (xc.length - yc.length < 0) {
        t = yc;
        yc = xc;
        xc = t;
    }
    e = yc.length;
    // Only start adding at yc.length - 1 as the further digits of xc can be left as they are.
    for (k = 0; e; xc[e] %= 10)
        k = (xc[--e] = xc[e] + yc[e] + k) / 10 | 0;
    // No need to check for zero, as +x + +y != 0 && -x + -y != 0
    if (k) {
        xc.unshift(k);
        ++ye;
    }
    // Remove trailing zeros.
    for (e = xc.length; xc[--e] === 0;)
        xc.pop();
    y.c = xc;
    y.e = ye;
    return y;
};
/*
 * Return a Big whose value is the value of this Big raised to the power n.
 * If n is negative, round to a maximum of Big.DP decimal places using rounding
 * mode Big.RM.
 *
 * n {number} Integer, -MAX_POWER to MAX_POWER inclusive.
 */
P.pow = function (n) {
    var Big = this.constructor, x = new Big(this), y = new Big('1'), one = new Big('1'), isneg = n < 0;
    if (n !== ~~n || n < -MAX_POWER || n > MAX_POWER) {
        throw Error(INVALID + 'exponent');
    }
    if (isneg)
        n = -n;
    for (;;) {
        if (n & 1)
            y = y.times(x);
        n >>= 1;
        if (!n)
            break;
        x = x.times(x);
    }
    return isneg ? one.div(y) : y;
};
/*
 * Return a new Big whose value is the value of this Big rounded to a maximum precision of sd
 * significant digits using rounding mode rm, or Big.RM if rm is not specified.
 *
 * sd {number} Significant digits: integer, 1 to MAX_DP inclusive.
 * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
 */
P.prec = function (sd, rm) {
    if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
        throw Error(INVALID + 'precision');
    }
    return round(new this.constructor(this), sd, rm);
};
/*
 * Return a new Big whose value is the value of this Big rounded to a maximum of dp decimal places
 * using rounding mode rm, or Big.RM if rm is not specified.
 * If dp is negative, round to an integer which is a multiple of 10**-dp.
 * If dp is not specified, round to 0 decimal places.
 *
 * dp? {number} Integer, -MAX_DP to MAX_DP inclusive.
 * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
 */
P.round = function (dp, rm) {
    if (dp === UNDEFINED)
        dp = 0;
    else if (dp !== ~~dp || dp < -MAX_DP || dp > MAX_DP) {
        throw Error(INVALID_DP);
    }
    return round(new this.constructor(this), dp + this.e + 1, rm);
};
/*
 * Return a new Big whose value is the square root of the value of this Big, rounded, if
 * necessary, to a maximum of Big.DP decimal places using rounding mode Big.RM.
 */
P.sqrt = function () {
    var r, c, t, Big = this.constructor, x = new Big(this), s = x.s, e = x.e, half = new Big('0.5');
    // Zero?
    if (!x.c[0])
        return new Big(x);
    // Negative?
    if (s < 0) {
        throw Error(NAME + 'No square root');
    }
    // Estimate.
    s = Math.sqrt(x + '');
    // Math.sqrt underflow/overflow?
    // Re-estimate: pass x coefficient to Math.sqrt as integer, then adjust the result exponent.
    if (s === 0 || s === 1 / 0) {
        c = x.c.join('');
        if (!(c.length + e & 1))
            c += '0';
        s = Math.sqrt(c);
        e = ((e + 1) / 2 | 0) - (e < 0 || e & 1);
        r = new Big((s == 1 / 0 ? '5e' : (s = s.toExponential()).slice(0, s.indexOf('e') + 1)) + e);
    }
    else {
        r = new Big(s + '');
    }
    e = r.e + (Big.DP += 4);
    // Newton-Raphson iteration.
    do {
        t = r;
        r = half.times(t.plus(x.div(t)));
    } while (t.c.slice(0, e).join('') !== r.c.slice(0, e).join(''));
    return round(r, (Big.DP -= 4) + r.e + 1, Big.RM);
};
/*
 * Return a new Big whose value is the value of this Big times the value of Big y.
 */
P.times = P.mul = function (y) {
    var c, Big = this.constructor, x = new Big(this), y = new Big(y), xc = x.c, yc = y.c, a = xc.length, b = yc.length, i = x.e, j = y.e;
    // Determine sign of result.
    y.s = x.s == y.s ? 1 : -1;
    // Return signed 0 if either 0.
    if (!xc[0] || !yc[0]) {
        y.c = [y.e = 0];
        return y;
    }
    // Initialise exponent of result as x.e + y.e.
    y.e = i + j;
    // If array xc has fewer digits than yc, swap xc and yc, and lengths.
    if (a < b) {
        c = xc;
        xc = yc;
        yc = c;
        j = a;
        a = b;
        b = j;
    }
    // Initialise coefficient array of result with zeros.
    for (c = new Array(j = a + b); j--;)
        c[j] = 0;
    // Multiply.
    // i is initially xc.length.
    for (i = b; i--;) {
        b = 0;
        // a is yc.length.
        for (j = a + i; j > i;) {
            // Current sum of products at this digit position, plus carry.
            b = c[j] + yc[i] * xc[j - i - 1] + b;
            c[j--] = b % 10;
            // carry
            b = b / 10 | 0;
        }
        c[j] = b;
    }
    // Increment result exponent if there is a final carry, otherwise remove leading zero.
    if (b)
        ++y.e;
    else
        c.shift();
    // Remove trailing zeros.
    for (i = c.length; !c[--i];)
        c.pop();
    y.c = c;
    return y;
};
/*
 * Return a string representing the value of this Big in exponential notation rounded to dp fixed
 * decimal places using rounding mode rm, or Big.RM if rm is not specified.
 *
 * dp? {number} Decimal places: integer, 0 to MAX_DP inclusive.
 * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
 */
P.toExponential = function (dp, rm) {
    var x = this, n = x.c[0];
    if (dp !== UNDEFINED) {
        if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
            throw Error(INVALID_DP);
        }
        x = round(new x.constructor(x), ++dp, rm);
        for (; x.c.length < dp;)
            x.c.push(0);
    }
    return stringify(x, true, !!n);
};
/*
 * Return a string representing the value of this Big in normal notation rounded to dp fixed
 * decimal places using rounding mode rm, or Big.RM if rm is not specified.
 *
 * dp? {number} Decimal places: integer, 0 to MAX_DP inclusive.
 * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
 *
 * (-0).toFixed(0) is '0', but (-0.1).toFixed(0) is '-0'.
 * (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
 */
P.toFixed = function (dp, rm) {
    var x = this, n = x.c[0];
    if (dp !== UNDEFINED) {
        if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
            throw Error(INVALID_DP);
        }
        x = round(new x.constructor(x), dp + x.e + 1, rm);
        // x.e may have changed if the value is rounded up.
        for (dp = dp + x.e + 1; x.c.length < dp;)
            x.c.push(0);
    }
    return stringify(x, false, !!n);
};
/*
 * Return a string representing the value of this Big.
 * Return exponential notation if this Big has a positive exponent equal to or greater than
 * Big.PE, or a negative exponent equal to or less than Big.NE.
 * Omit the sign for negative zero.
 */
P.toJSON = P.toString = function () {
    var x = this, Big = x.constructor;
    return stringify(x, x.e <= Big.NE || x.e >= Big.PE, !!x.c[0]);
};
/*
 * Return the value of this Big as a primitve number.
 */
P.toNumber = function () {
    var n = Number(stringify(this, true, true));
    if (this.constructor.strict === true && !this.eq(n.toString())) {
        throw Error(NAME + 'Imprecise conversion');
    }
    return n;
};
/*
 * Return a string representing the value of this Big rounded to sd significant digits using
 * rounding mode rm, or Big.RM if rm is not specified.
 * Use exponential notation if sd is less than the number of digits necessary to represent
 * the integer part of the value in normal notation.
 *
 * sd {number} Significant digits: integer, 1 to MAX_DP inclusive.
 * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
 */
P.toPrecision = function (sd, rm) {
    var x = this, Big = x.constructor, n = x.c[0];
    if (sd !== UNDEFINED) {
        if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
            throw Error(INVALID + 'precision');
        }
        x = round(new Big(x), sd, rm);
        for (; x.c.length < sd;)
            x.c.push(0);
    }
    return stringify(x, sd <= x.e || x.e <= Big.NE || x.e >= Big.PE, !!n);
};
/*
 * Return a string representing the value of this Big.
 * Return exponential notation if this Big has a positive exponent equal to or greater than
 * Big.PE, or a negative exponent equal to or less than Big.NE.
 * Include the sign for negative zero.
 */
P.valueOf = function () {
    var x = this, Big = x.constructor;
    if (Big.strict === true) {
        throw Error(NAME + 'valueOf disallowed');
    }
    return stringify(x, x.e <= Big.NE || x.e >= Big.PE, true);
};
// Export
/**
 * @type object
 */
var Big = _Big_();

const symbol = Symbol("numeric");
function isNumeric(x) {
    return typeof x === "number" || typeof x === "bigint" || x?.[symbol];
}
function compare(x, y) {
    if (typeof x === "number") {
        return x < y ? -1 : (x > y ? 1 : 0);
    }
    else if (typeof x === "bigint") {
        return x < y ? -1 : (x > y ? 1 : 0);
    }
    else {
        return x.CompareTo(y);
    }
}
function multiply(x, y) {
    if (typeof x === "number") {
        return x * y;
    }
    else if (typeof x === "bigint") {
        return x * BigInt(y);
    }
    else {
        return x[symbol]().multiply(y);
    }
}
function toFixed(x, dp) {
    if (typeof x === "number") {
        return x.toFixed(dp);
    }
    else if (typeof x === "bigint") {
        return x;
    }
    else {
        return x[symbol]().toFixed(dp);
    }
}
function toPrecision(x, sd) {
    if (typeof x === "number") {
        return x.toPrecision(sd);
    }
    else if (typeof x === "bigint") {
        return x;
    }
    else {
        return x[symbol]().toPrecision(sd);
    }
}
function toExponential(x, dp) {
    if (typeof x === "number") {
        return x.toExponential(dp);
    }
    else if (typeof x === "bigint") {
        return x;
    }
    else {
        return x[symbol]().toExponential(dp);
    }
}
function toHex(x) {
    if (typeof x === "number") {
        return (Number(x) >>> 0).toString(16);
    }
    else if (typeof x === "bigint") {
        // TODO: properly handle other bit sizes
        return BigInt.asUintN(64, x).toString(16);
    }
    else {
        return x[symbol]().toHex();
    }
}

Big.prototype.GetHashCode = function () {
    return combineHashCodes([this.s, this.e].concat(this.c));
};
Big.prototype.Equals = function (x) {
    return !this.cmp(x);
};
Big.prototype.CompareTo = function (x) {
    return this.cmp(x);
};
Big.prototype[symbol] = function () {
    const _this = this;
    return {
        multiply: (y) => _this.mul(y),
        toPrecision: (sd) => _this.toPrecision(sd),
        toExponential: (dp) => _this.toExponential(dp),
        toFixed: (dp) => _this.toFixed(dp),
        toHex: () => (Number(_this) >>> 0).toString(16),
    };
};
new Big(0);
new Big(1);
new Big(-1);
new Big("79228162514264337593543950335");
new Big("-79228162514264337593543950335");
// export function makeRangeStepFunction(step: Decimal, last: Decimal) {
//   const stepComparedWithZero = step.cmp(get_Zero);
//   if (stepComparedWithZero === 0) {
//     throw new Error("The step of a range cannot be zero");
//   }
//   const stepGreaterThanZero = stepComparedWithZero > 0;
//   return (x: Decimal) => {
//     const comparedWithLast = x.cmp(last);
//     if ((stepGreaterThanZero && comparedWithLast <= 0)
//       || (!stepGreaterThanZero && comparedWithLast >= 0)) {
//       return [x, op_Addition(x, step)];
//     } else {
//       return undefined;
//     }
//   };
// }

class CaseInfo {
    constructor(declaringType, tag, name, fields) {
        this.declaringType = declaringType;
        this.tag = tag;
        this.name = name;
        this.fields = fields;
    }
}
class TypeInfo {
    constructor(fullname, generics, construct, parent, fields, cases, enumCases) {
        this.fullname = fullname;
        this.generics = generics;
        this.construct = construct;
        this.parent = parent;
        this.fields = fields;
        this.cases = cases;
        this.enumCases = enumCases;
    }
    toString() {
        return fullName(this);
    }
    GetHashCode() {
        return getHashCode(this);
    }
    Equals(other) {
        return equals(this, other);
    }
}
function getGenerics(t) {
    return t.generics != null ? t.generics : [];
}
function getHashCode(t) {
    const fullnameHash = stringHash(t.fullname);
    const genHashes = getGenerics(t).map(getHashCode);
    return combineHashCodes([fullnameHash, ...genHashes]);
}
function equals(t1, t2) {
    if (t1.fullname === "") { // Anonymous records
        return t2.fullname === ""
            && equalArraysWith(getRecordElements(t1), getRecordElements(t2), ([k1, v1], [k2, v2]) => k1 === k2 && equals(v1, v2));
    }
    else {
        return t1.fullname === t2.fullname
            && equalArraysWith(getGenerics(t1), getGenerics(t2), equals);
    }
}
function class_type(fullname, generics, construct, parent) {
    return new TypeInfo(fullname, generics, construct, parent);
}
function record_type(fullname, generics, construct, fields) {
    return new TypeInfo(fullname, generics, construct, undefined, fields);
}
function union_type(fullname, generics, construct, cases) {
    const t = new TypeInfo(fullname, generics, construct, undefined, undefined, () => {
        const caseNames = construct.prototype.cases();
        return cases().map((fields, i) => new CaseInfo(t, i, caseNames[i], fields));
    });
    return t;
}
function tuple_type(...generics) {
    return new TypeInfo("System.Tuple`" + generics.length, generics);
}
function option_type(generic) {
    return new TypeInfo("Microsoft.FSharp.Core.FSharpOption`1", [generic]);
}
function list_type(generic) {
    return new TypeInfo("Microsoft.FSharp.Collections.FSharpList`1", [generic]);
}
function array_type(generic) {
    return new TypeInfo("[]", [generic]);
}
const string_type = new TypeInfo("System.String");
const bool_type = new TypeInfo("System.Boolean");
const int32_type = new TypeInfo("System.Int32");
const uint32_type = new TypeInfo("System.UInt32");
const float64_type = new TypeInfo("System.Double");
function fullName(t) {
    const elemType = getElementType(t);
    if (elemType != null) {
        return fullName(elemType) + "[]";
    }
    else if (t.generics == null || t.generics.length === 0) {
        return t.fullname;
    }
    else {
        return t.fullname + "[" + t.generics.map((x) => fullName(x)).join(",") + "]";
    }
}
function getElementType(t) {
    return t.fullname === "[]" && t.generics?.length === 1 ? t.generics[0] : undefined;
}
function getRecordElements(t) {
    if (t.fields != null) {
        return t.fields();
    }
    else {
        throw new Error(`${t.fullname} is not an F# record type`);
    }
}

// Using a class here for better compatibility with TS files importing Some
class Some {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return this.value;
    }
    // Don't add "Some" for consistency with erased options
    toString() {
        return String(this.value);
    }
    GetHashCode() {
        return structuralHash(this.value);
    }
    Equals(other) {
        if (other == null) {
            return false;
        }
        else {
            return equals$1(this.value, other instanceof Some ? other.value : other);
        }
    }
    CompareTo(other) {
        if (other == null) {
            return 1;
        }
        else {
            return compare$1(this.value, other instanceof Some ? other.value : other);
        }
    }
}
function value(x) {
    if (x == null) {
        throw new Error("Option has no value");
    }
    else {
        return x instanceof Some ? x.value : x;
    }
}
function some(x) {
    return x == null || x instanceof Some ? new Some(x) : x;
}
function defaultArg(opt, defaultValue) {
    return (opt != null) ? value(opt) : defaultValue;
}
function map$2(mapping, opt) {
    return (opt != null) ? some(mapping(value(opt))) : undefined;
}

BigInt.prototype.toJSON = function () {
    return `${this.toString()}`;
};

/**
 * DateTimeOffset functions.
 *
 * Note: Date instances are always DateObjects in local
 * timezone (because JS dates are all kinds of messed up).
 * A local date returns UTC epoch when `.getTime()` is called.
 *
 * Basically; invariant: date.getTime() always return UTC time.
 */
function dateOffsetToString(offset) {
    const isMinus = offset < 0;
    offset = Math.abs(offset);
    const hours = ~~(offset / 3600000);
    const minutes = (offset % 3600000) / 60000;
    return (isMinus ? "-" : "+") +
        padWithZeros(hours, 2) + ":" +
        padWithZeros(minutes, 2);
}
function dateToHalfUTCString(date, half) {
    const str = date.toISOString();
    return half === "first"
        ? str.substring(0, str.indexOf("T"))
        : str.substring(str.indexOf("T") + 1, str.length - 1);
}
function dateToISOString(d, utc) {
    if (utc) {
        return d.toISOString();
    }
    else {
        // JS Date is always local
        const printOffset = d.kind == null ? true : d.kind === 2 /* DateKind.Local */;
        return padWithZeros(d.getFullYear(), 4) + "-" +
            padWithZeros(d.getMonth() + 1, 2) + "-" +
            padWithZeros(d.getDate(), 2) + "T" +
            padWithZeros(d.getHours(), 2) + ":" +
            padWithZeros(d.getMinutes(), 2) + ":" +
            padWithZeros(d.getSeconds(), 2) + "." +
            padWithZeros(d.getMilliseconds(), 3) +
            (printOffset ? dateOffsetToString(d.getTimezoneOffset() * -60000) : "");
    }
}
function dateToISOStringWithOffset(dateWithOffset, offset) {
    const str = dateWithOffset.toISOString();
    return str.substring(0, str.length - 1) + dateOffsetToString(offset);
}
function dateToStringWithCustomFormat(date, format, utc) {
    return format.replace(/(\w)\1*/g, (match) => {
        let rep = Number.NaN;
        switch (match.substring(0, 1)) {
            case "y":
                const y = utc ? date.getUTCFullYear() : date.getFullYear();
                rep = match.length < 4 ? y % 100 : y;
                break;
            case "M":
                rep = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
                break;
            case "d":
                rep = utc ? date.getUTCDate() : date.getDate();
                break;
            case "H":
                rep = utc ? date.getUTCHours() : date.getHours();
                break;
            case "h":
                const h = utc ? date.getUTCHours() : date.getHours();
                rep = h > 12 ? h % 12 : h;
                break;
            case "m":
                rep = utc ? date.getUTCMinutes() : date.getMinutes();
                break;
            case "s":
                rep = utc ? date.getUTCSeconds() : date.getSeconds();
                break;
            case "f":
                rep = utc ? date.getUTCMilliseconds() : date.getMilliseconds();
                break;
        }
        if (Number.isNaN(rep)) {
            return match;
        }
        else {
            return padWithZeros(rep, match.length);
        }
    });
}
function dateToStringWithOffset(date, format) {
    const d = new Date(date.getTime() + (date.offset ?? 0));
    if (typeof format !== "string") {
        return d.toISOString().replace(/\.\d+/, "").replace(/[A-Z]|\.\d+/g, " ") + dateOffsetToString((date.offset ?? 0));
    }
    else if (format.length === 1) {
        switch (format) {
            case "D":
            case "d": return dateToHalfUTCString(d, "first");
            case "T":
            case "t": return dateToHalfUTCString(d, "second");
            case "O":
            case "o": return dateToISOStringWithOffset(d, (date.offset ?? 0));
            default: throw new Error("Unrecognized Date print format");
        }
    }
    else {
        return dateToStringWithCustomFormat(d, format, true);
    }
}
function dateToStringWithKind(date, format) {
    const utc = date.kind === 1 /* DateKind.UTC */;
    if (typeof format !== "string") {
        return utc ? date.toUTCString() : date.toLocaleString();
    }
    else if (format.length === 1) {
        switch (format) {
            case "D":
            case "d":
                return utc ? dateToHalfUTCString(date, "first") : date.toLocaleDateString();
            case "T":
            case "t":
                return utc ? dateToHalfUTCString(date, "second") : date.toLocaleTimeString();
            case "O":
            case "o":
                return dateToISOString(date, utc);
            default:
                throw new Error("Unrecognized Date print format");
        }
    }
    else {
        return dateToStringWithCustomFormat(date, format, utc);
    }
}
function toString(date, format, _provider) {
    return date.offset != null
        ? dateToStringWithOffset(date, format)
        : dateToStringWithKind(date, format);
}

// From http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escape(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

const fsFormatRegExp = /(^|[^%])%([0+\- ]*)(\*|\d+)?(?:\.(\d+))?(\w)/g;
const formatRegExp = /\{(\d+)(,-?\d+)?(?:\:([a-zA-Z])(\d{0,2})|\:(.+?))?\}/g;
function isLessThan(x, y) {
    return compare(x, y) < 0;
}
function printf(input) {
    return {
        input,
        cont: fsFormat(input),
    };
}
function continuePrint(cont, arg) {
    return typeof arg === "string" ? cont(arg) : arg.cont(cont);
}
function toText(arg) {
    return continuePrint((x) => x, arg);
}
function formatReplacement(rep, flags, padLength, precision, format) {
    let sign = "";
    flags = flags || "";
    format = format || "";
    if (isNumeric(rep)) {
        if (format.toLowerCase() !== "x") {
            if (isLessThan(rep, 0)) {
                rep = multiply(rep, -1);
                sign = "-";
            }
            else {
                if (flags.indexOf(" ") >= 0) {
                    sign = " ";
                }
                else if (flags.indexOf("+") >= 0) {
                    sign = "+";
                }
            }
        }
        precision = precision == null ? null : parseInt(precision, 10);
        switch (format) {
            case "f":
            case "F":
                precision = precision != null ? precision : 6;
                rep = toFixed(rep, precision);
                break;
            case "g":
            case "G":
                rep = precision != null ? toPrecision(rep, precision) : toPrecision(rep);
                break;
            case "e":
            case "E":
                rep = precision != null ? toExponential(rep, precision) : toExponential(rep);
                break;
            case "x":
                rep = toHex(rep);
                break;
            case "X":
                rep = toHex(rep).toUpperCase();
                break;
            default: // AOid
                rep = String(rep);
                break;
        }
    }
    else if (rep instanceof Date) {
        rep = toString(rep);
    }
    else {
        rep = toString$1(rep);
    }
    padLength = typeof padLength === "number" ? padLength : parseInt(padLength, 10);
    if (!isNaN(padLength)) {
        const zeroFlag = flags.indexOf("0") >= 0; // Use '0' for left padding
        const minusFlag = flags.indexOf("-") >= 0; // Right padding
        const ch = minusFlag || !zeroFlag ? " " : "0";
        if (ch === "0") {
            rep = pad(rep, padLength - sign.length, ch, minusFlag);
            rep = sign + rep;
        }
        else {
            rep = pad(sign + rep, padLength, ch, minusFlag);
        }
    }
    else {
        rep = sign + rep;
    }
    return rep;
}
function createPrinter(cont, _strParts, _matches, _result = "", padArg = -1) {
    return (...args) => {
        // Make copies of the values passed by reference because the function can be used multiple times
        let result = _result;
        const strParts = _strParts.slice();
        const matches = _matches.slice();
        for (const arg of args) {
            const [, , flags, _padLength, precision, format] = matches[0];
            let padLength = _padLength;
            if (padArg >= 0) {
                padLength = padArg;
                padArg = -1;
            }
            else if (padLength === "*") {
                if (arg < 0) {
                    throw new Error("Non-negative number required");
                }
                padArg = arg;
                continue;
            }
            result += strParts[0];
            result += formatReplacement(arg, flags, padLength, precision, format);
            strParts.splice(0, 1);
            matches.splice(0, 1);
        }
        if (matches.length === 0) {
            result += strParts[0];
            return cont(result);
        }
        else {
            return createPrinter(cont, strParts, matches, result, padArg);
        }
    };
}
function fsFormat(str) {
    return (cont) => {
        fsFormatRegExp.lastIndex = 0;
        const strParts = [];
        const matches = [];
        let strIdx = 0;
        let match = fsFormatRegExp.exec(str);
        while (match) {
            // The first group corresponds to the no-escape char (^|[^%]), the actual pattern starts in the next char
            // Note: we don't use negative lookbehind because some browsers don't support it yet
            const matchIndex = match.index + (match[1] || "").length;
            strParts.push(str.substring(strIdx, matchIndex).replace(/%%/g, "%"));
            matches.push(match);
            strIdx = fsFormatRegExp.lastIndex;
            // Likewise we need to move fsFormatRegExp.lastIndex one char behind to make sure we match the no-escape char next time
            fsFormatRegExp.lastIndex -= 1;
            match = fsFormatRegExp.exec(str);
        }
        if (strParts.length === 0) {
            return cont(str.replace(/%%/g, "%"));
        }
        else {
            strParts.push(str.substring(strIdx).replace(/%%/g, "%"));
            return createPrinter(cont, strParts, matches);
        }
    };
}
function format(str, ...args) {
    let str2;
    if (typeof str === "object") {
        // Called with culture info
        str2 = String(args[0]);
        args.shift();
    }
    else {
        str2 = str;
    }
    return str2.replace(formatRegExp, (_, idx, padLength, format, precision, pattern) => {
        if (idx < 0 || idx >= args.length) {
            throw new Error("Index must be greater or equal to zero and less than the arguments' length.");
        }
        let rep = args[idx];
        if (isNumeric(rep)) {
            precision = precision == null ? null : parseInt(precision, 10);
            switch (format) {
                case "f":
                case "F":
                    precision = precision != null ? precision : 2;
                    rep = toFixed(rep, precision);
                    break;
                case "g":
                case "G":
                    rep = precision != null ? toPrecision(rep, precision) : toPrecision(rep);
                    break;
                case "e":
                case "E":
                    rep = precision != null ? toExponential(rep, precision) : toExponential(rep);
                    break;
                case "p":
                case "P":
                    precision = precision != null ? precision : 2;
                    rep = toFixed(multiply(rep, 100), precision) + " %";
                    break;
                case "d":
                case "D":
                    rep = precision != null ? padLeft(String(rep), precision, "0") : String(rep);
                    break;
                case "x":
                case "X":
                    rep = precision != null ? padLeft(toHex(rep), precision, "0") : toHex(rep);
                    if (format === "X") {
                        rep = rep.toUpperCase();
                    }
                    break;
                default:
                    if (pattern) {
                        let sign = "";
                        rep = pattern.replace(/([0#,]+)(\.[0#]+)?/, (_, intPart, decimalPart) => {
                            if (isLessThan(rep, 0)) {
                                rep = multiply(rep, -1);
                                sign = "-";
                            }
                            decimalPart = decimalPart == null ? "" : decimalPart.substring(1);
                            rep = toFixed(rep, Math.max(decimalPart.length, 0));
                            let [repInt, repDecimal] = rep.split(".");
                            repDecimal || (repDecimal = "");
                            const leftZeroes = intPart.replace(/,/g, "").replace(/^#+/, "").length;
                            repInt = padLeft(repInt, leftZeroes, "0");
                            const rightZeros = decimalPart.replace(/#+$/, "").length;
                            if (rightZeros > repDecimal.length) {
                                repDecimal = padRight(repDecimal, rightZeros, "0");
                            }
                            else if (rightZeros < repDecimal.length) {
                                repDecimal = repDecimal.substring(0, rightZeros) + repDecimal.substring(rightZeros).replace(/0+$/, "");
                            }
                            // Thousands separator
                            if (intPart.indexOf(",") > 0) {
                                const i = repInt.length % 3;
                                const thousandGroups = Math.floor(repInt.length / 3);
                                let thousands = i > 0 ? repInt.substr(0, i) + (thousandGroups > 0 ? "," : "") : "";
                                for (let j = 0; j < thousandGroups; j++) {
                                    thousands += repInt.substr(i + j * 3, 3) + (j < thousandGroups - 1 ? "," : "");
                                }
                                repInt = thousands;
                            }
                            return repDecimal.length > 0 ? repInt + "." + repDecimal : repInt;
                        });
                        rep = sign + rep;
                    }
            }
        }
        else if (rep instanceof Date) {
            rep = toString(rep, pattern || format);
        }
        else {
            rep = toString$1(rep);
        }
        padLength = parseInt((padLength || " ").substring(1), 10);
        if (!isNaN(padLength)) {
            rep = pad(String(rep), Math.abs(padLength), " ", padLength < 0);
        }
        return rep;
    });
}
function join(delimiter, xs) {
    if (Array.isArray(xs)) {
        return xs.join(delimiter);
    }
    else {
        return Array.from(xs).join(delimiter);
    }
}
function pad(str, len, ch, isRight) {
    ch = ch || " ";
    len = len - str.length;
    for (let i = 0; i < len; i++) {
        str = isRight ? str + ch : ch + str;
    }
    return str;
}
function padLeft(str, len, ch) {
    return pad(str, len, ch);
}
function padRight(str, len, ch) {
    return pad(str, len, ch, true);
}
function replace(str, search, replace) {
    return str.replace(new RegExp(escape(search), "g"), replace);
}
function split(str, splitters, count, options) {
    count = typeof count === "number" ? count : undefined;
    options = typeof options === "number" ? options : 0;
    if (count && count < 0) {
        throw new Error("Count cannot be less than zero");
    }
    if (count === 0) {
        return [];
    }
    const removeEmpty = (options & 1) === 1;
    const trim = (options & 2) === 2;
    splitters = splitters || [];
    splitters = splitters.filter(x => x).map(escape);
    splitters = splitters.length > 0 ? splitters : ["\\s"];
    const splits = [];
    const reg = new RegExp(splitters.join("|"), "g");
    let findSplits = true;
    let i = 0;
    do {
        const match = reg.exec(str);
        if (match === null) {
            const candidate = trim ? str.substring(i).trim() : str.substring(i);
            if (!removeEmpty || candidate.length > 0) {
                splits.push(candidate);
            }
            findSplits = false;
        }
        else {
            const candidate = trim ? str.substring(i, match.index).trim() : str.substring(i, match.index);
            if (!removeEmpty || candidate.length > 0) {
                if (count != null && splits.length + 1 === count) {
                    splits.push(trim ? str.substring(i).trim() : str.substring(i));
                    findSplits = false;
                }
                else {
                    splits.push(candidate);
                }
            }
            i = reg.lastIndex;
        }
    } while (findSplits);
    return splits;
}
function filter(pred, x) {
    return x.split("").filter((c) => pred(c)).join("");
}

const SR_inputWasEmpty = "Collection was empty.";

function Helpers_allocateArrayFromCons(cons, len) {
    if ((typeof cons) === "function") {
        return new cons(len);
    }
    else {
        return new Array(len);
    }
}

function differentLengths() {
    throw new Error("Arrays had different lengths");
}
function append(array1, array2, cons) {
    const len1 = array1.length | 0;
    const len2 = array2.length | 0;
    const newArray = Helpers_allocateArrayFromCons(cons, len1 + len2);
    for (let i = 0; i <= (len1 - 1); i++) {
        newArray[i] = array1[i];
    }
    for (let i_1 = 0; i_1 <= (len2 - 1); i_1++) {
        newArray[i_1 + len1] = array2[i_1];
    }
    return newArray;
}
function fill(target, targetIndex, count, value) {
    const start = targetIndex | 0;
    return target.fill(value, start, (start + count));
}
function last(array) {
    if (array.length === 0) {
        throw new Error("The input array was empty\\nParameter name: array");
    }
    return array[array.length - 1];
}
function map$1(f, source, cons) {
    const len = source.length | 0;
    const target = Helpers_allocateArrayFromCons(cons, len);
    for (let i = 0; i <= (len - 1); i++) {
        target[i] = f(source[i]);
    }
    return target;
}
function concat(arrays, cons) {
    const arrays_1 = Array.isArray(arrays) ? arrays : (Array.from(arrays));
    const matchValue = arrays_1.length | 0;
    switch (matchValue) {
        case 0:
            return Helpers_allocateArrayFromCons(cons, 0);
        case 1:
            return arrays_1[0];
        default: {
            let totalIdx = 0;
            let totalLength = 0;
            for (let idx = 0; idx <= (arrays_1.length - 1); idx++) {
                const arr_1 = arrays_1[idx];
                totalLength = ((totalLength + arr_1.length) | 0);
            }
            const result = Helpers_allocateArrayFromCons(cons, totalLength);
            for (let idx_1 = 0; idx_1 <= (arrays_1.length - 1); idx_1++) {
                const arr_2 = arrays_1[idx_1];
                for (let j = 0; j <= (arr_2.length - 1); j++) {
                    result[totalIdx] = arr_2[j];
                    totalIdx = ((totalIdx + 1) | 0);
                }
            }
            return result;
        }
    }
}
function collect(mapping, array, cons) {
    return concat(map$1(mapping, array, defaultOf()), cons);
}
function indexOf(array, item_1, start, count, eq) {
    const start_1 = defaultArg(start, 0) | 0;
    const end$0027 = defaultArg(map$2((c) => (start_1 + c), count), array.length) | 0;
    const loop = (i_mut) => {
        loop: while (true) {
            const i = i_mut;
            if (i >= end$0027) {
                return -1;
            }
            else if (eq.Equals(item_1, array[i])) {
                return i | 0;
            }
            else {
                i_mut = (i + 1);
                continue loop;
            }
        }
    };
    return loop(start_1) | 0;
}
function contains$1(value, array, eq) {
    return indexOf(array, value, void 0, void 0, eq) >= 0;
}
function singleton$1(value, cons) {
    const ar = Helpers_allocateArrayFromCons(cons, 1);
    ar[0] = value;
    return ar;
}
function fold$3(folder, state, array) {
    return array.reduce((folder), state);
}
function zip(array1, array2) {
    if (array1.length !== array2.length) {
        differentLengths();
    }
    const result = new Array(array1.length);
    for (let i = 0; i <= (array1.length - 1); i++) {
        result[i] = [array1[i], array2[i]];
    }
    return result;
}
function head$1(array) {
    if (array.length === 0) {
        throw new Error("The input array was empty\\nParameter name: array");
    }
    else {
        return array[0];
    }
}
function reduce(reduction, array) {
    if (array.length === 0) {
        throw new Error("The input array was empty");
    }
    const reduction_1 = reduction;
    return array.reduce(reduction_1);
}
function sum(array, adder) {
    let acc = adder.GetZero();
    for (let i = 0; i <= (array.length - 1); i++) {
        acc = adder.Add(acc, array[i]);
    }
    return acc;
}
function sumBy(projection, array, adder) {
    let acc = adder.GetZero();
    for (let i = 0; i <= (array.length - 1); i++) {
        acc = adder.Add(acc, projection(array[i]));
    }
    return acc;
}
function maxBy(projection, xs, comparer) {
    return reduce((x, y) => ((comparer.Compare(projection(y), projection(x)) > 0) ? y : x), xs);
}

class FSharpList extends Record {
    constructor(head, tail) {
        super();
        this.head = head;
        this.tail = tail;
    }
    toString() {
        const xs = this;
        return ("[" + join("; ", xs)) + "]";
    }
    Equals(other) {
        const xs = this;
        if (xs === other) {
            return true;
        }
        else {
            const loop = (xs_1_mut, ys_1_mut) => {
                loop: while (true) {
                    const xs_1 = xs_1_mut, ys_1 = ys_1_mut;
                    const matchValue = xs_1.tail;
                    const matchValue_1 = ys_1.tail;
                    if (matchValue != null) {
                        if (matchValue_1 != null) {
                            const xt = value(matchValue);
                            const yt = value(matchValue_1);
                            if (equals$1(xs_1.head, ys_1.head)) {
                                xs_1_mut = xt;
                                ys_1_mut = yt;
                                continue loop;
                            }
                            else {
                                return false;
                            }
                        }
                        else {
                            return false;
                        }
                    }
                    else if (matchValue_1 != null) {
                        return false;
                    }
                    else {
                        return true;
                    }
                }
            };
            return loop(xs, other);
        }
    }
    GetHashCode() {
        const xs = this;
        const loop = (i_mut, h_mut, xs_1_mut) => {
            loop: while (true) {
                const i = i_mut, h = h_mut, xs_1 = xs_1_mut;
                const matchValue = xs_1.tail;
                if (matchValue != null) {
                    const t = value(matchValue);
                    if (i > 18) {
                        return h | 0;
                    }
                    else {
                        i_mut = (i + 1);
                        h_mut = (((h << 1) + structuralHash(xs_1.head)) + (631 * i));
                        xs_1_mut = t;
                        continue loop;
                    }
                }
                else {
                    return h | 0;
                }
            }
        };
        return loop(0, 0, xs) | 0;
    }
    toJSON() {
        const this$ = this;
        return Array.from(this$);
    }
    CompareTo(other) {
        const xs = this;
        const loop = (xs_1_mut, ys_1_mut) => {
            loop: while (true) {
                const xs_1 = xs_1_mut, ys_1 = ys_1_mut;
                const matchValue = xs_1.tail;
                const matchValue_1 = ys_1.tail;
                if (matchValue != null) {
                    if (matchValue_1 != null) {
                        const xt = value(matchValue);
                        const yt = value(matchValue_1);
                        const c = compare$1(xs_1.head, ys_1.head) | 0;
                        if (c === 0) {
                            xs_1_mut = xt;
                            ys_1_mut = yt;
                            continue loop;
                        }
                        else {
                            return c | 0;
                        }
                    }
                    else {
                        return 1;
                    }
                }
                else if (matchValue_1 != null) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
        };
        return loop(xs, other) | 0;
    }
    GetEnumerator() {
        const xs = this;
        return ListEnumerator$1_$ctor_3002E699(xs);
    }
    [Symbol.iterator]() {
        return toIterator(getEnumerator(this));
    }
    "System.Collections.IEnumerable.GetEnumerator"() {
        const xs = this;
        return getEnumerator(xs);
    }
}
class ListEnumerator$1 {
    constructor(xs) {
        this.xs = xs;
        this.it = this.xs;
        this.current = defaultOf();
    }
    "System.Collections.Generic.IEnumerator`1.get_Current"() {
        const _ = this;
        return _.current;
    }
    "System.Collections.IEnumerator.get_Current"() {
        const _ = this;
        return _.current;
    }
    "System.Collections.IEnumerator.MoveNext"() {
        const _ = this;
        const matchValue = _.it.tail;
        if (matchValue != null) {
            const t = value(matchValue);
            _.current = _.it.head;
            _.it = t;
            return true;
        }
        else {
            return false;
        }
    }
    "System.Collections.IEnumerator.Reset"() {
        const _ = this;
        _.it = _.xs;
        _.current = defaultOf();
    }
    Dispose() {
    }
}
function ListEnumerator$1_$ctor_3002E699(xs) {
    return new ListEnumerator$1(xs);
}
function FSharpList_get_Empty() {
    return new FSharpList(defaultOf(), void 0);
}
function FSharpList_Cons_305B8EAC(x, xs) {
    return new FSharpList(x, xs);
}
function FSharpList__get_IsEmpty(xs) {
    return xs.tail == null;
}
function FSharpList__get_Length(xs) {
    const loop = (i_mut, xs_1_mut) => {
        loop: while (true) {
            const i = i_mut, xs_1 = xs_1_mut;
            const matchValue = xs_1.tail;
            if (matchValue != null) {
                i_mut = (i + 1);
                xs_1_mut = value(matchValue);
                continue loop;
            }
            else {
                return i | 0;
            }
        }
    };
    return loop(0, xs) | 0;
}
function FSharpList__get_Head(xs) {
    const matchValue = xs.tail;
    if (matchValue != null) {
        return xs.head;
    }
    else {
        throw new Error((SR_inputWasEmpty + "\\nParameter name: ") + "list");
    }
}
function FSharpList__get_Tail(xs) {
    const matchValue = xs.tail;
    if (matchValue != null) {
        return value(matchValue);
    }
    else {
        throw new Error((SR_inputWasEmpty + "\\nParameter name: ") + "list");
    }
}
function empty$1() {
    return FSharpList_get_Empty();
}
function singleton(x) {
    return FSharpList_Cons_305B8EAC(x, FSharpList_get_Empty());
}
function isEmpty(xs) {
    return FSharpList__get_IsEmpty(xs);
}
function head(xs) {
    return FSharpList__get_Head(xs);
}
function tail(xs) {
    return FSharpList__get_Tail(xs);
}
function toArray$1(xs) {
    const len = FSharpList__get_Length(xs) | 0;
    const res = fill(new Array(len), 0, len, null);
    const loop = (i_mut, xs_1_mut) => {
        loop: while (true) {
            const i = i_mut, xs_1 = xs_1_mut;
            if (!FSharpList__get_IsEmpty(xs_1)) {
                res[i] = FSharpList__get_Head(xs_1);
                i_mut = (i + 1);
                xs_1_mut = FSharpList__get_Tail(xs_1);
                continue loop;
            }
            break;
        }
    };
    loop(0, xs);
    return res;
}
function fold$2(folder, state, xs) {
    let acc = state;
    let xs_1 = xs;
    while (!FSharpList__get_IsEmpty(xs_1)) {
        acc = folder(acc, head(xs_1));
        xs_1 = FSharpList__get_Tail(xs_1);
    }
    return acc;
}
function ofArrayWithTail(xs, tail_1) {
    let res = tail_1;
    for (let i = xs.length - 1; i >= 0; i--) {
        res = FSharpList_Cons_305B8EAC(xs[i], res);
    }
    return res;
}

function Operators_NullArg(x) {
    throw new Error(x);
}

const SR_enumerationAlreadyFinished = "Enumeration already finished.";
const SR_enumerationNotStarted = "Enumeration has not started. Call MoveNext.";
const SR_resetNotSupported = "Reset is not supported on this enumerator.";
function Enumerator_noReset() {
    throw new Error(SR_resetNotSupported);
}
function Enumerator_notStarted() {
    throw new Error(SR_enumerationNotStarted);
}
function Enumerator_alreadyFinished() {
    throw new Error(SR_enumerationAlreadyFinished);
}
class Enumerator_Seq {
    constructor(f) {
        this.f = f;
    }
    toString() {
        const xs = this;
        let i = 0;
        let str = "seq [";
        const e = getEnumerator(xs);
        try {
            while ((i < 4) && e["System.Collections.IEnumerator.MoveNext"]()) {
                if (i > 0) {
                    str = (str + "; ");
                }
                str = (str + toString$1(e["System.Collections.Generic.IEnumerator`1.get_Current"]()));
                i = ((i + 1) | 0);
            }
            if (i === 4) {
                str = (str + "; ...");
            }
            return str + "]";
        }
        finally {
            disposeSafe(e);
        }
    }
    GetEnumerator() {
        const x = this;
        return x.f();
    }
    [Symbol.iterator]() {
        return toIterator(getEnumerator(this));
    }
    "System.Collections.IEnumerable.GetEnumerator"() {
        const x = this;
        return x.f();
    }
}
function Enumerator_Seq_$ctor_673A07F2(f) {
    return new Enumerator_Seq(f);
}
class Enumerator_FromFunctions$1 {
    constructor(current, next, dispose) {
        this.current = current;
        this.next = next;
        this.dispose = dispose;
    }
    "System.Collections.Generic.IEnumerator`1.get_Current"() {
        const _ = this;
        return _.current();
    }
    "System.Collections.IEnumerator.get_Current"() {
        const _ = this;
        return _.current();
    }
    "System.Collections.IEnumerator.MoveNext"() {
        const _ = this;
        return _.next();
    }
    "System.Collections.IEnumerator.Reset"() {
        Enumerator_noReset();
    }
    Dispose() {
        const _ = this;
        _.dispose();
    }
}
function Enumerator_FromFunctions$1_$ctor_58C54629(current, next, dispose) {
    return new Enumerator_FromFunctions$1(current, next, dispose);
}
function Enumerator_generateWhileSome(openf, compute, closef) {
    let started = false;
    let curr = void 0;
    let state = some(openf());
    const dispose = () => {
        if (state != null) {
            const x_1 = value(state);
            try {
                closef(x_1);
            }
            finally {
                state = void 0;
            }
        }
    };
    const finish = () => {
        try {
            dispose();
        }
        finally {
            curr = void 0;
        }
    };
    return Enumerator_FromFunctions$1_$ctor_58C54629(() => {
        if (!started) {
            Enumerator_notStarted();
        }
        if (curr != null) {
            return value(curr);
        }
        else {
            return Enumerator_alreadyFinished();
        }
    }, () => {
        if (!started) {
            started = true;
        }
        if (state != null) {
            const s = value(state);
            let matchValue_1;
            try {
                matchValue_1 = compute(s);
            }
            catch (matchValue) {
                finish();
                throw matchValue;
            }
            if (matchValue_1 != null) {
                curr = matchValue_1;
                return true;
            }
            else {
                finish();
                return false;
            }
        }
        else {
            return false;
        }
    }, dispose);
}
function checkNonNull(argName, arg) {
    if (arg == null) {
        Operators_NullArg(argName);
    }
}
function mkSeq(f) {
    return Enumerator_Seq_$ctor_673A07F2(f);
}
function ofSeq$1(xs) {
    checkNonNull("source", xs);
    return getEnumerator(xs);
}
function toArray(xs) {
    if (xs instanceof FSharpList) {
        const a = xs;
        return toArray$1(a);
    }
    else {
        return Array.from(xs);
    }
}
function generate(create, compute, dispose) {
    return mkSeq(() => Enumerator_generateWhileSome(create, compute, dispose));
}
function compareWith(comparer, xs, ys) {
    const e1 = ofSeq$1(xs);
    try {
        const e2 = ofSeq$1(ys);
        try {
            let c = 0;
            let b1 = e1["System.Collections.IEnumerator.MoveNext"]();
            let b2 = e2["System.Collections.IEnumerator.MoveNext"]();
            while (((c === 0) && b1) && b2) {
                c = (comparer(e1["System.Collections.Generic.IEnumerator`1.get_Current"](), e2["System.Collections.Generic.IEnumerator`1.get_Current"]()) | 0);
                if (c === 0) {
                    b1 = e1["System.Collections.IEnumerator.MoveNext"]();
                    b2 = e2["System.Collections.IEnumerator.MoveNext"]();
                }
            }
            return ((c !== 0) ? c : (b1 ? 1 : (b2 ? -1 : 0))) | 0;
        }
        finally {
            disposeSafe(e2);
        }
    }
    finally {
        disposeSafe(e1);
    }
}
function contains(value, xs, comparer) {
    const e = ofSeq$1(xs);
    try {
        let found = false;
        while (!found && e["System.Collections.IEnumerator.MoveNext"]()) {
            found = comparer.Equals(value, e["System.Collections.Generic.IEnumerator`1.get_Current"]());
        }
        return found;
    }
    finally {
        disposeSafe(e);
    }
}
function fold$1(folder, state, xs) {
    const e = ofSeq$1(xs);
    try {
        let acc = state;
        while (e["System.Collections.IEnumerator.MoveNext"]()) {
            acc = folder(acc, e["System.Collections.Generic.IEnumerator`1.get_Current"]());
        }
        return acc;
    }
    finally {
        disposeSafe(e);
    }
}
function iterate(action, xs) {
    fold$1((unitVar, x) => {
        action(x);
    }, void 0, xs);
}
function map(mapping, xs) {
    return generate(() => ofSeq$1(xs), (e) => (e["System.Collections.IEnumerator.MoveNext"]() ? some(mapping(e["System.Collections.Generic.IEnumerator`1.get_Current"]())) : void 0), (e_1) => {
        disposeSafe(e_1);
    });
}

class MapTreeLeaf$2 {
    constructor(k, v) {
        this.k = k;
        this.v = v;
    }
}
function MapTreeLeaf$2_$ctor_5BDDA1(k, v) {
    return new MapTreeLeaf$2(k, v);
}
function MapTreeLeaf$2__get_Key(_) {
    return _.k;
}
function MapTreeLeaf$2__get_Value(_) {
    return _.v;
}
class MapTreeNode$2 extends MapTreeLeaf$2 {
    constructor(k, v, left, right, h) {
        super(k, v);
        this.left = left;
        this.right = right;
        this.h = (h | 0);
    }
}
function MapTreeNode$2_$ctor_Z39DE9543(k, v, left, right, h) {
    return new MapTreeNode$2(k, v, left, right, h);
}
function MapTreeNode$2__get_Left(_) {
    return _.left;
}
function MapTreeNode$2__get_Right(_) {
    return _.right;
}
function MapTreeNode$2__get_Height(_) {
    return _.h;
}
function MapTreeModule_empty() {
    return void 0;
}
function MapTreeModule_sizeAux(acc_mut, m_mut) {
    MapTreeModule_sizeAux: while (true) {
        const acc = acc_mut, m = m_mut;
        if (m != null) {
            const m2 = value(m);
            if (m2 instanceof MapTreeNode$2) {
                const mn = m2;
                acc_mut = MapTreeModule_sizeAux(acc + 1, MapTreeNode$2__get_Left(mn));
                m_mut = MapTreeNode$2__get_Right(mn);
                continue MapTreeModule_sizeAux;
            }
            else {
                return (acc + 1) | 0;
            }
        }
        else {
            return acc | 0;
        }
    }
}
function MapTreeModule_size(x) {
    return MapTreeModule_sizeAux(0, x);
}
function MapTreeModule_mk(l, k, v, r) {
    let mn, mn_1;
    let hl;
    const m = l;
    if (m != null) {
        const m2 = value(m);
        hl = ((m2 instanceof MapTreeNode$2) ? ((mn = m2, MapTreeNode$2__get_Height(mn))) : 1);
    }
    else {
        hl = 0;
    }
    let hr;
    const m_1 = r;
    if (m_1 != null) {
        const m2_1 = value(m_1);
        hr = ((m2_1 instanceof MapTreeNode$2) ? ((mn_1 = m2_1, MapTreeNode$2__get_Height(mn_1))) : 1);
    }
    else {
        hr = 0;
    }
    const m_2 = ((hl < hr) ? hr : hl) | 0;
    if (m_2 === 0) {
        return MapTreeLeaf$2_$ctor_5BDDA1(k, v);
    }
    else {
        return MapTreeNode$2_$ctor_Z39DE9543(k, v, l, r, m_2 + 1);
    }
}
function MapTreeModule_rebalance(t1, k, v, t2) {
    let mn, mn_1, m_2, m2_2, mn_2, m_3, m2_3, mn_3;
    let t1h;
    const m = t1;
    if (m != null) {
        const m2 = value(m);
        t1h = ((m2 instanceof MapTreeNode$2) ? ((mn = m2, MapTreeNode$2__get_Height(mn))) : 1);
    }
    else {
        t1h = 0;
    }
    let t2h;
    const m_1 = t2;
    if (m_1 != null) {
        const m2_1 = value(m_1);
        t2h = ((m2_1 instanceof MapTreeNode$2) ? ((mn_1 = m2_1, MapTreeNode$2__get_Height(mn_1))) : 1);
    }
    else {
        t2h = 0;
    }
    if (t2h > (t1h + 2)) {
        const matchValue = value(t2);
        if (matchValue instanceof MapTreeNode$2) {
            const t2$0027 = matchValue;
            if (((m_2 = MapTreeNode$2__get_Left(t2$0027), (m_2 != null) ? ((m2_2 = value(m_2), (m2_2 instanceof MapTreeNode$2) ? ((mn_2 = m2_2, MapTreeNode$2__get_Height(mn_2))) : 1)) : 0)) > (t1h + 1)) {
                const matchValue_1 = value(MapTreeNode$2__get_Left(t2$0027));
                if (matchValue_1 instanceof MapTreeNode$2) {
                    const t2l = matchValue_1;
                    return MapTreeModule_mk(MapTreeModule_mk(t1, k, v, MapTreeNode$2__get_Left(t2l)), MapTreeLeaf$2__get_Key(t2l), MapTreeLeaf$2__get_Value(t2l), MapTreeModule_mk(MapTreeNode$2__get_Right(t2l), MapTreeLeaf$2__get_Key(t2$0027), MapTreeLeaf$2__get_Value(t2$0027), MapTreeNode$2__get_Right(t2$0027)));
                }
                else {
                    throw new Error("internal error: Map.rebalance");
                }
            }
            else {
                return MapTreeModule_mk(MapTreeModule_mk(t1, k, v, MapTreeNode$2__get_Left(t2$0027)), MapTreeLeaf$2__get_Key(t2$0027), MapTreeLeaf$2__get_Value(t2$0027), MapTreeNode$2__get_Right(t2$0027));
            }
        }
        else {
            throw new Error("internal error: Map.rebalance");
        }
    }
    else if (t1h > (t2h + 2)) {
        const matchValue_2 = value(t1);
        if (matchValue_2 instanceof MapTreeNode$2) {
            const t1$0027 = matchValue_2;
            if (((m_3 = MapTreeNode$2__get_Right(t1$0027), (m_3 != null) ? ((m2_3 = value(m_3), (m2_3 instanceof MapTreeNode$2) ? ((mn_3 = m2_3, MapTreeNode$2__get_Height(mn_3))) : 1)) : 0)) > (t2h + 1)) {
                const matchValue_3 = value(MapTreeNode$2__get_Right(t1$0027));
                if (matchValue_3 instanceof MapTreeNode$2) {
                    const t1r = matchValue_3;
                    return MapTreeModule_mk(MapTreeModule_mk(MapTreeNode$2__get_Left(t1$0027), MapTreeLeaf$2__get_Key(t1$0027), MapTreeLeaf$2__get_Value(t1$0027), MapTreeNode$2__get_Left(t1r)), MapTreeLeaf$2__get_Key(t1r), MapTreeLeaf$2__get_Value(t1r), MapTreeModule_mk(MapTreeNode$2__get_Right(t1r), k, v, t2));
                }
                else {
                    throw new Error("internal error: Map.rebalance");
                }
            }
            else {
                return MapTreeModule_mk(MapTreeNode$2__get_Left(t1$0027), MapTreeLeaf$2__get_Key(t1$0027), MapTreeLeaf$2__get_Value(t1$0027), MapTreeModule_mk(MapTreeNode$2__get_Right(t1$0027), k, v, t2));
            }
        }
        else {
            throw new Error("internal error: Map.rebalance");
        }
    }
    else {
        return MapTreeModule_mk(t1, k, v, t2);
    }
}
function MapTreeModule_add(comparer, k, v, m) {
    if (m != null) {
        const m2 = value(m);
        const c = comparer.Compare(k, MapTreeLeaf$2__get_Key(m2)) | 0;
        if (m2 instanceof MapTreeNode$2) {
            const mn = m2;
            if (c < 0) {
                return MapTreeModule_rebalance(MapTreeModule_add(comparer, k, v, MapTreeNode$2__get_Left(mn)), MapTreeLeaf$2__get_Key(mn), MapTreeLeaf$2__get_Value(mn), MapTreeNode$2__get_Right(mn));
            }
            else if (c === 0) {
                return MapTreeNode$2_$ctor_Z39DE9543(k, v, MapTreeNode$2__get_Left(mn), MapTreeNode$2__get_Right(mn), MapTreeNode$2__get_Height(mn));
            }
            else {
                return MapTreeModule_rebalance(MapTreeNode$2__get_Left(mn), MapTreeLeaf$2__get_Key(mn), MapTreeLeaf$2__get_Value(mn), MapTreeModule_add(comparer, k, v, MapTreeNode$2__get_Right(mn)));
            }
        }
        else if (c < 0) {
            return MapTreeNode$2_$ctor_Z39DE9543(k, v, MapTreeModule_empty(), m, 2);
        }
        else if (c === 0) {
            return MapTreeLeaf$2_$ctor_5BDDA1(k, v);
        }
        else {
            return MapTreeNode$2_$ctor_Z39DE9543(k, v, m, MapTreeModule_empty(), 2);
        }
    }
    else {
        return MapTreeLeaf$2_$ctor_5BDDA1(k, v);
    }
}
function MapTreeModule_tryFind(comparer_mut, k_mut, m_mut) {
    MapTreeModule_tryFind: while (true) {
        const comparer = comparer_mut, k = k_mut, m = m_mut;
        if (m != null) {
            const m2 = value(m);
            const c = comparer.Compare(k, MapTreeLeaf$2__get_Key(m2)) | 0;
            if (c === 0) {
                return some(MapTreeLeaf$2__get_Value(m2));
            }
            else if (m2 instanceof MapTreeNode$2) {
                const mn = m2;
                comparer_mut = comparer;
                k_mut = k;
                m_mut = ((c < 0) ? MapTreeNode$2__get_Left(mn) : MapTreeNode$2__get_Right(mn));
                continue MapTreeModule_tryFind;
            }
            else {
                return void 0;
            }
        }
        else {
            return void 0;
        }
    }
}
function MapTreeModule_find(comparer, k, m) {
    const matchValue = MapTreeModule_tryFind(comparer, k, m);
    if (matchValue == null) {
        throw new Error();
    }
    else {
        return value(matchValue);
    }
}
function MapTreeModule_mem(comparer_mut, k_mut, m_mut) {
    MapTreeModule_mem: while (true) {
        const comparer = comparer_mut, k = k_mut, m = m_mut;
        if (m != null) {
            const m2 = value(m);
            const c = comparer.Compare(k, MapTreeLeaf$2__get_Key(m2)) | 0;
            if (m2 instanceof MapTreeNode$2) {
                const mn = m2;
                if (c < 0) {
                    comparer_mut = comparer;
                    k_mut = k;
                    m_mut = MapTreeNode$2__get_Left(mn);
                    continue MapTreeModule_mem;
                }
                else if (c === 0) {
                    return true;
                }
                else {
                    comparer_mut = comparer;
                    k_mut = k;
                    m_mut = MapTreeNode$2__get_Right(mn);
                    continue MapTreeModule_mem;
                }
            }
            else {
                return c === 0;
            }
        }
        else {
            return false;
        }
    }
}
function MapTreeModule_iterOpt(f_mut, m_mut) {
    MapTreeModule_iterOpt: while (true) {
        const f = f_mut, m = m_mut;
        if (m != null) {
            const m2 = value(m);
            if (m2 instanceof MapTreeNode$2) {
                const mn = m2;
                MapTreeModule_iterOpt(f, MapTreeNode$2__get_Left(mn));
                f(MapTreeLeaf$2__get_Key(mn), MapTreeLeaf$2__get_Value(mn));
                f_mut = f;
                m_mut = MapTreeNode$2__get_Right(mn);
                continue MapTreeModule_iterOpt;
            }
            else {
                f(MapTreeLeaf$2__get_Key(m2), MapTreeLeaf$2__get_Value(m2));
            }
        }
        break;
    }
}
function MapTreeModule_iter(f, m) {
    MapTreeModule_iterOpt(f, m);
}
function MapTreeModule_foldOpt(f_mut, x_mut, m_mut) {
    MapTreeModule_foldOpt: while (true) {
        const f = f_mut, x = x_mut, m = m_mut;
        if (m != null) {
            const m2 = value(m);
            if (m2 instanceof MapTreeNode$2) {
                const mn = m2;
                f_mut = f;
                x_mut = f(MapTreeModule_foldOpt(f, x, MapTreeNode$2__get_Left(mn)), MapTreeLeaf$2__get_Key(mn), MapTreeLeaf$2__get_Value(mn));
                m_mut = MapTreeNode$2__get_Right(mn);
                continue MapTreeModule_foldOpt;
            }
            else {
                return f(x, MapTreeLeaf$2__get_Key(m2), MapTreeLeaf$2__get_Value(m2));
            }
        }
        else {
            return x;
        }
    }
}
function MapTreeModule_fold(f, x, m) {
    return MapTreeModule_foldOpt(f, x, m);
}
function MapTreeModule_copyToArray(m, arr, i) {
    let j = i;
    MapTreeModule_iter((x, y) => {
        arr[j] = [x, y];
        j = ((j + 1) | 0);
    }, m);
}
function MapTreeModule_toArray(m) {
    const n = MapTreeModule_size(m) | 0;
    const res = fill(new Array(n), 0, n, [null, null]);
    MapTreeModule_copyToArray(m, res, 0);
    return res;
}
function MapTreeModule_ofList(comparer, l) {
    return fold$2((acc, tupledArg) => MapTreeModule_add(comparer, tupledArg[0], tupledArg[1], acc), MapTreeModule_empty(), l);
}
function MapTreeModule_mkFromEnumerator(comparer_mut, acc_mut, e_mut) {
    MapTreeModule_mkFromEnumerator: while (true) {
        const comparer = comparer_mut, acc = acc_mut, e = e_mut;
        if (e["System.Collections.IEnumerator.MoveNext"]()) {
            const patternInput = e["System.Collections.Generic.IEnumerator`1.get_Current"]();
            comparer_mut = comparer;
            acc_mut = MapTreeModule_add(comparer, patternInput[0], patternInput[1], acc);
            e_mut = e;
            continue MapTreeModule_mkFromEnumerator;
        }
        else {
            return acc;
        }
    }
}
function MapTreeModule_ofArray(comparer, arr) {
    let res = MapTreeModule_empty();
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const forLoopVar = arr[idx];
        res = MapTreeModule_add(comparer, forLoopVar[0], forLoopVar[1], res);
    }
    return res;
}
function MapTreeModule_ofSeq(comparer, c) {
    if (isArrayLike(c)) {
        return MapTreeModule_ofArray(comparer, c);
    }
    else if (c instanceof FSharpList) {
        return MapTreeModule_ofList(comparer, c);
    }
    else {
        const ie = getEnumerator(c);
        try {
            return MapTreeModule_mkFromEnumerator(comparer, MapTreeModule_empty(), ie);
        }
        finally {
            disposeSafe(ie);
        }
    }
}
class MapTreeModule_MapIterator$2 extends Record {
    constructor(stack, started) {
        super();
        this.stack = stack;
        this.started = started;
    }
}
function MapTreeModule_collapseLHS(stack_mut) {
    MapTreeModule_collapseLHS: while (true) {
        const stack = stack_mut;
        if (!isEmpty(stack)) {
            const rest = tail(stack);
            const m = head(stack);
            if (m != null) {
                const m2 = value(m);
                if (m2 instanceof MapTreeNode$2) {
                    const mn = m2;
                    stack_mut = ofArrayWithTail([MapTreeNode$2__get_Left(mn), MapTreeLeaf$2_$ctor_5BDDA1(MapTreeLeaf$2__get_Key(mn), MapTreeLeaf$2__get_Value(mn)), MapTreeNode$2__get_Right(mn)], rest);
                    continue MapTreeModule_collapseLHS;
                }
                else {
                    return stack;
                }
            }
            else {
                stack_mut = rest;
                continue MapTreeModule_collapseLHS;
            }
        }
        else {
            return empty$1();
        }
    }
}
function MapTreeModule_mkIterator(m) {
    return new MapTreeModule_MapIterator$2(MapTreeModule_collapseLHS(singleton(m)), false);
}
function MapTreeModule_notStarted() {
    throw new Error("enumeration not started");
}
function MapTreeModule_alreadyFinished() {
    throw new Error("enumeration already finished");
}
function MapTreeModule_current(i) {
    if (i.started) {
        const matchValue = i.stack;
        if (!isEmpty(matchValue)) {
            if (head(matchValue) != null) {
                const m = value(head(matchValue));
                if (m instanceof MapTreeNode$2) {
                    throw new Error("Please report error: Map iterator, unexpected stack for current");
                }
                else {
                    return [MapTreeLeaf$2__get_Key(m), MapTreeLeaf$2__get_Value(m)];
                }
            }
            else {
                throw new Error("Please report error: Map iterator, unexpected stack for current");
            }
        }
        else {
            return MapTreeModule_alreadyFinished();
        }
    }
    else {
        return MapTreeModule_notStarted();
    }
}
function MapTreeModule_moveNext(i) {
    if (i.started) {
        const matchValue = i.stack;
        if (!isEmpty(matchValue)) {
            if (head(matchValue) != null) {
                const m = value(head(matchValue));
                if (m instanceof MapTreeNode$2) {
                    throw new Error("Please report error: Map iterator, unexpected stack for moveNext");
                }
                else {
                    i.stack = MapTreeModule_collapseLHS(tail(matchValue));
                    return !isEmpty(i.stack);
                }
            }
            else {
                throw new Error("Please report error: Map iterator, unexpected stack for moveNext");
            }
        }
        else {
            return false;
        }
    }
    else {
        i.started = true;
        return !isEmpty(i.stack);
    }
}
function MapTreeModule_mkIEnumerator(m) {
    let i = MapTreeModule_mkIterator(m);
    return {
        "System.Collections.Generic.IEnumerator`1.get_Current"() {
            return MapTreeModule_current(i);
        },
        "System.Collections.IEnumerator.get_Current"() {
            return MapTreeModule_current(i);
        },
        "System.Collections.IEnumerator.MoveNext"() {
            return MapTreeModule_moveNext(i);
        },
        "System.Collections.IEnumerator.Reset"() {
            i = MapTreeModule_mkIterator(m);
        },
        Dispose() {
        },
    };
}
class FSharpMap {
    constructor(comparer, tree) {
        this.comparer = comparer;
        this.tree = tree;
    }
    GetHashCode() {
        const this$ = this;
        return FSharpMap__ComputeHashCode(this$) | 0;
    }
    Equals(that) {
        const this$ = this;
        if (that instanceof FSharpMap) {
            const that_1 = that;
            const e1 = getEnumerator(this$);
            try {
                const e2 = getEnumerator(that_1);
                try {
                    const loop = () => {
                        const m1 = e1["System.Collections.IEnumerator.MoveNext"]();
                        if (m1 === e2["System.Collections.IEnumerator.MoveNext"]()) {
                            if (!m1) {
                                return true;
                            }
                            else {
                                const e1c = e1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                                const e2c = e2["System.Collections.Generic.IEnumerator`1.get_Current"]();
                                if (equals$1(e1c[0], e2c[0]) && equals$1(e1c[1], e2c[1])) {
                                    return loop();
                                }
                                else {
                                    return false;
                                }
                            }
                        }
                        else {
                            return false;
                        }
                    };
                    return loop();
                }
                finally {
                    disposeSafe(e2);
                }
            }
            finally {
                disposeSafe(e1);
            }
        }
        else {
            return false;
        }
    }
    toString() {
        const this$ = this;
        return ("map [" + join("; ", map((kv) => format("({0}, {1})", kv[0], kv[1]), this$))) + "]";
    }
    get [Symbol.toStringTag]() {
        return "FSharpMap";
    }
    toJSON() {
        const this$ = this;
        return Array.from(this$);
    }
    GetEnumerator() {
        const _ = this;
        return MapTreeModule_mkIEnumerator(_.tree);
    }
    [Symbol.iterator]() {
        return toIterator(getEnumerator(this));
    }
    "System.Collections.IEnumerable.GetEnumerator"() {
        const _ = this;
        return MapTreeModule_mkIEnumerator(_.tree);
    }
    CompareTo(obj) {
        const m = this;
        if (obj instanceof FSharpMap) {
            const m2 = obj;
            return compareWith((kvp1, kvp2) => {
                const c = m.comparer.Compare(kvp1[0], kvp2[0]) | 0;
                return ((c !== 0) ? c : compare$1(kvp1[1], kvp2[1])) | 0;
            }, m, m2) | 0;
        }
        else {
            throw new Error("not comparable\\nParameter name: obj");
        }
    }
    "System.Collections.Generic.ICollection`1.Add2B595"(x) {
        throw new Error("Map cannot be mutated");
    }
    "System.Collections.Generic.ICollection`1.Clear"() {
        throw new Error("Map cannot be mutated");
    }
    "System.Collections.Generic.ICollection`1.Remove2B595"(x) {
        throw new Error("Map cannot be mutated");
    }
    "System.Collections.Generic.ICollection`1.Contains2B595"(x) {
        const m = this;
        return FSharpMap__ContainsKey(m, x[0]) && equals$1(FSharpMap__get_Item(m, x[0]), x[1]);
    }
    "System.Collections.Generic.ICollection`1.CopyToZ3B4C077E"(arr, i) {
        const m = this;
        MapTreeModule_copyToArray(m.tree, arr, i);
    }
    "System.Collections.Generic.ICollection`1.get_IsReadOnly"() {
        return true;
    }
    "System.Collections.Generic.ICollection`1.get_Count"() {
        const m = this;
        return FSharpMap__get_Count(m) | 0;
    }
    "System.Collections.Generic.IReadOnlyCollection`1.get_Count"() {
        const m = this;
        return FSharpMap__get_Count(m) | 0;
    }
    get size() {
        const m = this;
        return FSharpMap__get_Count(m) | 0;
    }
    clear() {
        throw new Error("Map cannot be mutated");
    }
    delete(_arg) {
        throw new Error("Map cannot be mutated");
    }
    entries() {
        const m = this;
        return map((p) => [p[0], p[1]], m);
    }
    get(k) {
        const m = this;
        return FSharpMap__get_Item(m, k);
    }
    has(k) {
        const m = this;
        return FSharpMap__ContainsKey(m, k);
    }
    keys() {
        const m = this;
        return map((p) => p[0], m);
    }
    set(k, v) {
        throw new Error("Map cannot be mutated");
    }
    values() {
        const m = this;
        return map((p) => p[1], m);
    }
    forEach(f, thisArg) {
        const m = this;
        iterate((p) => {
            f(p[1], p[0], m);
        }, m);
    }
}
function FSharpMap_$ctor(comparer, tree) {
    return new FSharpMap(comparer, tree);
}
function FSharpMap_Empty(comparer) {
    return FSharpMap_$ctor(comparer, MapTreeModule_empty());
}
function FSharpMap__get_Tree(m) {
    return m.tree;
}
function FSharpMap__Add(m, key, value) {
    return FSharpMap_$ctor(m.comparer, MapTreeModule_add(m.comparer, key, value, m.tree));
}
function FSharpMap__get_Item(m, key) {
    return MapTreeModule_find(m.comparer, key, m.tree);
}
function FSharpMap__get_Count(m) {
    return MapTreeModule_size(m.tree);
}
function FSharpMap__ContainsKey(m, key) {
    return MapTreeModule_mem(m.comparer, key, m.tree);
}
function FSharpMap__get_Keys(_) {
    return map$1((kvp) => kvp[0], MapTreeModule_toArray(_.tree));
}
function FSharpMap__get_Values(_) {
    return map$1((kvp) => kvp[1], MapTreeModule_toArray(_.tree));
}
function FSharpMap__ComputeHashCode(this$) {
    const combineHash = (x, y) => (((x << 1) + y) + 631);
    let res = 0;
    const enumerator = getEnumerator(this$);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const activePatternResult = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            res = (combineHash(res, structuralHash(activePatternResult[0])) | 0);
            res = (combineHash(res, structuralHash(activePatternResult[1])) | 0);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return res | 0;
}
function add(key, value, table) {
    return FSharpMap__Add(table, key, value);
}
function containsKey(key, table) {
    return FSharpMap__ContainsKey(table, key);
}
function fold(folder, state, table) {
    return MapTreeModule_fold(folder, state, FSharpMap__get_Tree(table));
}
function ofSeq(elements, comparer) {
    return FSharpMap_$ctor(comparer, MapTreeModule_ofSeq(comparer, elements));
}
function ofArray(elements, comparer) {
    return FSharpMap_$ctor(comparer, MapTreeModule_ofSeq(comparer, elements));
}
function empty(comparer) {
    return FSharpMap_Empty(comparer);
}

var NumberStyles;
(function (NumberStyles) {
    // None = 0x00000000,
    // AllowLeadingWhite = 0x00000001,
    // AllowTrailingWhite = 0x00000002,
    // AllowLeadingSign = 0x00000004,
    // AllowTrailingSign = 0x00000008,
    // AllowParentheses = 0x00000010,
    // AllowDecimalPoint = 0x00000020,
    // AllowThousands = 0x00000040,
    // AllowExponent = 0x00000080,
    // AllowCurrencySymbol = 0x00000100,
    NumberStyles[NumberStyles["AllowHexSpecifier"] = 512] = "AllowHexSpecifier";
    // Integer = AllowLeadingWhite | AllowTrailingWhite | AllowLeadingSign,
    // HexNumber = AllowLeadingWhite | AllowTrailingWhite | AllowHexSpecifier,
    // Number = AllowLeadingWhite | AllowTrailingWhite | AllowLeadingSign |
    //          AllowTrailingSign | AllowDecimalPoint | AllowThousands,
    // Float = AllowLeadingWhite | AllowTrailingWhite | AllowLeadingSign |
    //         AllowDecimalPoint | AllowExponent,
    // Currency = AllowLeadingWhite | AllowTrailingWhite | AllowLeadingSign | AllowTrailingSign |
    //            AllowParentheses | AllowDecimalPoint | AllowThousands | AllowCurrencySymbol,
    // Any = AllowLeadingWhite | AllowTrailingWhite | AllowLeadingSign | AllowTrailingSign |
    //       AllowParentheses | AllowDecimalPoint | AllowThousands | AllowCurrencySymbol | AllowExponent,
})(NumberStyles || (NumberStyles = {}));
function validResponse(regexMatch, radix) {
    const [/*all*/ , sign, prefix, digits] = regexMatch;
    return {
        sign: sign || "",
        prefix: prefix || "",
        digits,
        radix,
    };
}
function getRange(unsigned, bitsize) {
    switch (bitsize) {
        case 8: return unsigned ? [0, 255] : [-128, 127];
        case 16: return unsigned ? [0, 65535] : [-32768, 32767];
        case 32: return unsigned ? [0, 4294967295] : [-2147483648, 2147483647];
        default: throw new Error("Invalid bit size.");
    }
}
function getInvalidDigits(radix) {
    switch (radix) {
        case 2: return /[^0-1]/;
        case 8: return /[^0-7]/;
        case 10: return /[^0-9]/;
        case 16: return /[^0-9a-fA-F]/;
        default:
            throw new Error("Invalid Base.");
    }
}
function getRadix(prefix, style) {
    if (style & NumberStyles.AllowHexSpecifier) {
        return 16;
    }
    else {
        switch (prefix) {
            case "0b":
            case "0B": return 2;
            case "0o":
            case "0O": return 8;
            case "0x":
            case "0X": return 16;
            default: return 10;
        }
    }
}
function isValid(str, style, radix) {
    const integerRegex = /^\s*([\+\-])?(0[xXoObB])?([0-9a-fA-F]+)\s*$/;
    const res = integerRegex.exec(str.replace(/_/g, ""));
    if (res != null) {
        const [/*all*/ , /*sign*/ , prefix, digits] = res;
        radix = radix || getRadix(prefix, style);
        const invalidDigits = getInvalidDigits(radix);
        if (!invalidDigits.test(digits)) {
            return validResponse(res, radix);
        }
    }
    return null;
}
function parse(str, style, unsigned, bitsize, radix) {
    const res = isValid(str, style, radix);
    if (res != null) {
        let v = Number.parseInt(res.sign + res.digits, res.radix);
        if (!Number.isNaN(v)) {
            const [umin, umax] = getRange(true, bitsize);
            if (!unsigned && res.radix !== 10 && v >= umin && v <= umax) {
                v = v << (32 - bitsize) >> (32 - bitsize);
            }
            const [min, max] = getRange(unsigned, bitsize);
            if (v >= min && v <= max) {
                return v;
            }
        }
    }
    throw new Error("Input string was not in a correct format.");
}
function tryParse(str, style, unsigned, bitsize, defValue) {
    try {
        defValue.contents = parse(str, style, unsigned, bitsize);
        return true;
    }
    catch {
        return false;
    }
}

function MathUtils_divideUintByUintThenRound(numerator, divisor, roundDown) {
    const floatCalculation = numerator / divisor;
    if (roundDown) {
        const value = Math.floor(floatCalculation);
        return value >>> 0;
    }
    else {
        const value_1 = Math.ceil(floatCalculation);
        return value_1 >>> 0;
    }
}

function MathUtils_divideUintsThenCompareToMaxThenRound(numerator, divisor, maxEO, roundDown) {
    const result = MathUtils_divideUintByUintThenRound(numerator, divisor, roundDown);
    if (maxEO == null) {
        return result;
    }
    else {
        const maxEO_1 = maxEO;
        if (maxEO_1 < result) {
            return maxEO_1;
        }
        else {
            return result;
        }
    }
}

function TypeUtils_stringArrayToTypeMap(stringTypeArray) {
    return ofArray(zip(stringTypeArray, map$1((stringType) => stringType, stringTypeArray)), {
        Compare: comparePrimitives,
    });
}

function MapUtils_createMapFromTuple2List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple3List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple4List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple5List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple6List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple7List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple9List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

function MapUtils_createMapFromTuple11List(createObjectFromTupleFunc, list) {
    return fold$3((map, tuple) => add(tuple[0], createObjectFromTupleFunc(tuple), map), empty({
        Compare: compare$1,
    }), list);
}

class Penetration_PenetrationCalculation extends Record {
    constructor(desc, penetrationDivisor) {
        super();
        this.desc = desc;
        this.penetrationDivisor = penetrationDivisor;
    }
}

function Penetration_PenetrationCalculation_$reflection() {
    return record_type("FallenLib.Penetration.PenetrationCalculation", [], Penetration_PenetrationCalculation, () => [["desc", string_type], ["penetrationDivisor", uint32_type]]);
}

function Penetration_tupleToPenetrationCalculation(desc, penetrationDivisor) {
    return new Penetration_PenetrationCalculation(desc, penetrationDivisor);
}

class Penetration_Penetration extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["PenetrationCalculation", "CalculatedPenetration"];
    }
}

function Penetration_Penetration_$reflection() {
    return union_type("FallenLib.Penetration.Penetration", [], Penetration_Penetration, () => [[["Item", Penetration_PenetrationCalculation_$reflection()]], [["Item", uint32_type]]]);
}

function Penetration_calculatePenetration(numDice, penetration) {
    if (penetration.tag === 1) {
        return penetration.fields[0];
    }
    else {
        return MathUtils_divideUintByUintThenRound(numDice, penetration.fields[0].penetrationDivisor, true);
    }
}

function Penetration_determinePenetration(numDice, primaryPenetration, secondaryPenetration) {
    if (secondaryPenetration.tag === 1) {
        return secondaryPenetration.fields[0] + Penetration_calculatePenetration(numDice, primaryPenetration);
    }
    else {
        return Penetration_calculatePenetration(numDice, new Penetration_Penetration(0, [secondaryPenetration.fields[0]]));
    }
}

function Penetration_createPenetrationMap(penetrationCalculationMap, str) {
    if (str.indexOf("CalculatedPenetration ") >= 0) {
        return new Penetration_Penetration(1, [parse(replace(str, "CalculatedPenetration ", ""), 511, true, 32)]);
    }
    else if (str.indexOf("PenetrationCalculation") >= 0) {
        return new Penetration_Penetration(0, [FSharpMap__get_Item(penetrationCalculationMap, replace(str, "PenetrationCalculation ", ""))]);
    }
    else {
        return new Penetration_Penetration(1, [0]);
    }
}

function Damage_damageTypesToString(damageTypes) {
    return join(", ", map$1((damageType) => {
        let copyOfStruct = damageType;
        return copyOfStruct;
    }, damageTypes));
}

function Damage_stringAndMapToDamageTypeArray(damageTypeMap, damageTypesString) {
    if (damageTypesString.length === 0) {
        return [];
    }
    else {
        return map$1((damageTypeString) => FSharpMap__get_Item(damageTypeMap, damageTypeString), split(damageTypesString, [", "], void 0, 0));
    }
}

class EngageableOpponents_EngageableOpponentsCalculation extends Record {
    constructor(desc, combatRollDivisor, maxEO) {
        super();
        this.desc = desc;
        this.combatRollDivisor = combatRollDivisor;
        this.maxEO = maxEO;
    }
}

function EngageableOpponents_EngageableOpponentsCalculation_$reflection() {
    return record_type("FallenLib.EngageableOpponents.EngageableOpponentsCalculation", [], EngageableOpponents_EngageableOpponentsCalculation, () => [["desc", string_type], ["combatRollDivisor", uint32_type], ["maxEO", option_type(uint32_type)]]);
}

class EngageableOpponents_EngageableOpponents extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Calculation", "Calculated"];
    }
}

function EngageableOpponents_EngageableOpponents_$reflection() {
    return union_type("FallenLib.EngageableOpponents.EngageableOpponents", [], EngageableOpponents_EngageableOpponents, () => [[["Item", EngageableOpponents_EngageableOpponentsCalculation_$reflection()]], [["Item", uint32_type]]]);
}

function EngageableOpponents_determineEngageableOpponents(numDice, engageableOpponents) {
    if (engageableOpponents.tag === 0) {
        const eoCalculation = engageableOpponents.fields[0];
        return MathUtils_divideUintsThenCompareToMaxThenRound(numDice, eoCalculation.combatRollDivisor, eoCalculation.maxEO, true);
    }
    else {
        return engageableOpponents.fields[0];
    }
}

function EngageableOpponents_mapMaxEO(input) {
    if (input.indexOf("MaxEO ") >= 0) {
        return parse(replace(input, "MaxEO ", ""), 511, true, 32);
    }
    else {
        return void 0;
    }
}

function EngageableOpponents_createEngageableOpponentsCalculation(tuple_, tuple__1, tuple__2) {
    const tuple = [tuple_, tuple__1, tuple__2];
    return new EngageableOpponents_EngageableOpponentsCalculation(tuple[0], tuple[1], EngageableOpponents_mapMaxEO(tuple[2]));
}

function EngageableOpponents_createCalculatedEngageableOpponents(tuple_, tuple__1) {
    return tuple__1;
}

const EngageableOpponents_createEOCalculationMap = (list) => MapUtils_createMapFromTuple3List((tupledArg) => EngageableOpponents_createEngageableOpponentsCalculation(tupledArg[0], tupledArg[1], tupledArg[2]), list);

const EngageableOpponents_createCalculatedEOMap = (list) => MapUtils_createMapFromTuple2List((tupledArg) => EngageableOpponents_createCalculatedEngageableOpponents(tupledArg[0], tupledArg[1]), list);

function EngageableOpponents_createEOInterface(calculatedEOMap, eoCalculationMap, input) {
    if (input.indexOf("EOCalculation ") >= 0) {
        return new EngageableOpponents_EngageableOpponents(0, [FSharpMap__get_Item(eoCalculationMap, replace(input, "EOCalculation ", ""))]);
    }
    else if (input.indexOf("CalculatedEO ") >= 0) {
        return new EngageableOpponents_EngageableOpponents(1, [FSharpMap__get_Item(calculatedEOMap, replace(input, "CalculatedEO ", ""))]);
    }
    else {
        return new EngageableOpponents_EngageableOpponents(1, [0]);
    }
}

class Neg1To4_Neg1To4 extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["NegOne", "Zero", "One", "Two", "Three", "Four"];
    }
}

function Neg1To4_Neg1To4_$reflection() {
    return union_type("FallenLib.Neg1To4.Neg1To4", [], Neg1To4_Neg1To4, () => [[], [], [], [], [], []]);
}

function Neg1To4_createNeg1To4(num) {
    switch (num) {
        case -1:
            return new Neg1To4_Neg1To4(0, []);
        case 0:
            return new Neg1To4_Neg1To4(1, []);
        case 1:
            return new Neg1To4_Neg1To4(2, []);
        case 2:
            return new Neg1To4_Neg1To4(3, []);
        case 3:
            return new Neg1To4_Neg1To4(4, []);
        case 4:
            return new Neg1To4_Neg1To4(5, []);
        default:
            return void 0;
    }
}

function Neg1To4_convert_Neg1To4_To_Int(num) {
    switch (num.tag) {
        case 1:
            return 0;
        case 2:
            return 1;
        case 3:
            return 2;
        case 4:
            return 3;
        case 5:
            return 4;
        default:
            return -1;
    }
}

function Neg1To4_intToNeg1To4(num) {
    return defaultArg(Neg1To4_createNeg1To4(num), new Neg1To4_Neg1To4(0, []));
}

class Dice_DicePool extends Record {
    constructor(d4, d6, d8, d10, d12, d20) {
        super();
        this.d4 = d4;
        this.d6 = d6;
        this.d8 = d8;
        this.d10 = d10;
        this.d12 = d12;
        this.d20 = d20;
    }
}

function Dice_DicePool_$reflection() {
    return record_type("FallenLib.Dice.DicePool", [], Dice_DicePool, () => [["d4", uint32_type], ["d6", uint32_type], ["d8", uint32_type], ["d10", uint32_type], ["d12", uint32_type], ["d20", uint32_type]]);
}

class Dice_DicePoolModification extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["AddDice", "RemoveDice"];
    }
}

function Dice_DicePoolModification_$reflection() {
    return union_type("FallenLib.Dice.DicePoolModification", [], Dice_DicePoolModification, () => [[["Item", Dice_DicePool_$reflection()]], [["Item", uint32_type]]]);
}

const Dice_emptyDicePool = new Dice_DicePool(0, 0, 0, 0, 0, 0);

const Dice_baseDicePool = new Dice_DicePool(0, 3, 0, 0, 0, 0);

function Dice_createD6DicePoolMod(numDice) {
    return new Dice_DicePoolModification(0, [new Dice_DicePool(0, numDice, 0, 0, 0, 0)]);
}

function Dice_diceToString(numDice, diceTypeString) {
    if (numDice !== 0) {
        return numDice.toString() + diceTypeString;
    }
    else {
        return "";
    }
}

function Dice_checkIfEmptyDicePoolString(dicePoolString) {
    if (dicePoolString === "") {
        return "0d6";
    }
    else {
        return dicePoolString;
    }
}

function Dice_dicePoolToString(dicePool) {
    let array;
    return Dice_checkIfEmptyDicePoolString(join(", ", (array = [Dice_diceToString(dicePool.d4, "d4"), Dice_diceToString(dicePool.d6, "d6"), Dice_diceToString(dicePool.d8, "d8"), Dice_diceToString(dicePool.d10, "d10"), Dice_diceToString(dicePool.d12, "d12"), Dice_diceToString(dicePool.d20, "d20")], array.filter((diceString) => (diceString !== "")))));
}

function Dice_combineDicePools(dicePools) {
    return fold$3((acc, pool) => (new Dice_DicePool(acc.d4 + pool.d4, acc.d6 + pool.d6, acc.d8 + pool.d8, acc.d10 + pool.d10, acc.d12 + pool.d12, acc.d20 + pool.d20)), new Dice_DicePool(0, 0, 0, 0, 0, 0), dicePools);
}

function Dice_removeDice(dice, neg) {
    const result = (~~dice - ~~neg) | 0;
    if (result < 0) {
        return [0, Math.abs(result) >>> 0];
    }
    else {
        return [result >>> 0, 0];
    }
}

function Dice_removeDiceFromDicePool(dicePool, numDiceToRemove) {
    const patternInput = Dice_removeDice(dicePool.d4, numDiceToRemove);
    const patternInput_1 = Dice_removeDice(dicePool.d6, patternInput[1]);
    const patternInput_2 = Dice_removeDice(dicePool.d8, patternInput_1[1]);
    const patternInput_3 = Dice_removeDice(dicePool.d10, patternInput_2[1]);
    const patternInput_4 = Dice_removeDice(dicePool.d12, patternInput_3[1]);
    return new Dice_DicePool(patternInput[0], patternInput_1[0], patternInput_2[0], patternInput_3[0], patternInput_4[0], Dice_removeDice(dicePool.d20, patternInput_4[1])[0]);
}

function Dice_modifyDicePool(dicePool, dicePoolModification) {
    if (dicePoolModification.tag === 1) {
        return Dice_removeDiceFromDicePool(dicePool, dicePoolModification.fields[0]);
    }
    else {
        return Dice_combineDicePools([dicePool, dicePoolModification.fields[0]]);
    }
}

function Dice_sumDicePool(dicePool) {
    return ((((dicePool.d4 + dicePool.d6) + dicePool.d8) + dicePool.d10) + dicePool.d12) + dicePool.d20;
}

function Dice_modifyDicePoolByModList(dicePool, dicePoolModifications) {
    const combinedDicePoolPenalty = new Dice_DicePoolModification(1, [fold$3((acc_1, diceMod) => ((diceMod.tag === 1) ? (acc_1 + diceMod.fields[0]) : acc_1), 0, dicePoolModifications)]);
    return Dice_modifyDicePool(fold$3((acc_2, diceMod_1) => ((diceMod_1.tag === 0) ? Dice_combineDicePools([acc_2, diceMod_1.fields[0]]) : acc_2), dicePool, dicePoolModifications), combinedDicePoolPenalty);
}

function Dice_dicePoolModToInt(dicePoolMod) {
    if (dicePoolMod.tag === 1) {
        return (~~dicePoolMod.fields[0] * -1) | 0;
    }
    else {
        return ~~Dice_sumDicePool(dicePoolMod.fields[0]) | 0;
    }
}

function Dice_intToDicePoolModification(num) {
    if (num < 0) {
        return new Dice_DicePoolModification(1, [Math.abs(num) >>> 0]);
    }
    else {
        return new Dice_DicePoolModification(0, [new Dice_DicePool(0, num >>> 0, 0, 0, 0, 0)]);
    }
}

function Dice_createDicePoolModification(numDiceStr, diceType) {
    const numDice = parse(numDiceStr, 511, true, 32);
    switch (diceType) {
        case "4":
            return new Dice_DicePool(numDice, 0, 0, 0, 0, 0);
        case "6":
            return new Dice_DicePool(0, numDice, 0, 0, 0, 0);
        case "8":
            return new Dice_DicePool(0, 0, numDice, 0, 0, 0);
        case "10":
            return new Dice_DicePool(0, 0, 0, numDice, 0, 0);
        case "12":
            return new Dice_DicePool(0, 0, 0, 0, numDice, 0);
        case "20":
            return new Dice_DicePool(0, 0, 0, 0, 0, numDice);
        default:
            return new Dice_DicePool(0, 0, 0, 0, 0, 0);
    }
}

function Dice_stringToDicePool(str) {
    return Dice_combineDicePools(map$1((diceStr) => {
        const diceNumAndDiceType = split(diceStr, ["d"], void 0, 0);
        return Dice_createDicePoolModification(diceNumAndDiceType[0], diceNumAndDiceType[1]);
    }, split(str, [", "], void 0, 0)));
}

function Dice_stringToDicePoolModification(dicePoolJSONString) {
    if (dicePoolJSONString.indexOf("AddDice ") >= 0) {
        return new Dice_DicePoolModification(0, [Dice_stringToDicePool(replace(dicePoolJSONString, "AddDice ", ""))]);
    }
    else if (dicePoolJSONString.indexOf("RemoveDice ") >= 0) {
        let matchValue;
        let outArg = 0;
        matchValue = [tryParse(replace(dicePoolJSONString, "RemoveDice ", ""), 511, true, 32, new FSharpRef(() => outArg, (v) => {
            outArg = v;
        })), outArg];
        if (matchValue[0]) {
            return new Dice_DicePoolModification(1, [matchValue[1]]);
        }
        else {
            return new Dice_DicePoolModification(1, [0]);
        }
    }
    else {
        return new Dice_DicePoolModification(1, [0]);
    }
}

function Dice_stringToDicePoolModificationOption(dicePoolJSONString) {
    if (dicePoolJSONString === "None") {
        return void 0;
    }
    else {
        return Dice_stringToDicePoolModification(dicePoolJSONString);
    }
}

class Attribute_AttributeStat extends Record {
    constructor(attribute, lvl) {
        super();
        this.attribute = attribute;
        this.lvl = lvl;
    }
}

function Attribute_AttributeStat_$reflection() {
    return record_type("FallenLib.Attribute.AttributeStat", [], Attribute_AttributeStat, () => [["attribute", string_type], ["lvl", Neg1To4_Neg1To4_$reflection()]]);
}

function Attribute_tupleToAttributeStat(attributeMap, attribute, lvl) {
    return new Attribute_AttributeStat(FSharpMap__get_Item(attributeMap, attribute), Neg1To4_intToNeg1To4(lvl));
}

function Attribute_determineAttributeLvl(attributeArray, attributeStatArray) {
    return sum(map$1(Neg1To4_convert_Neg1To4_To_Int, map$1((attributeStat) => (contains$1(attributeStat.attribute, attributeArray, {
        Equals: (x, y) => (x === y),
        GetHashCode: stringHash,
    }) ? attributeStat.lvl : (new Neg1To4_Neg1To4(1, []))), attributeStatArray), Int32Array), {
        GetZero: () => 0,
        Add: (x_1, y_1) => (x_1 + y_1),
    });
}

function Attribute_determineAttributeDiceMod(attributeArray, attributeStatArray) {
    return Dice_intToDicePoolModification(Attribute_determineAttributeLvl(attributeArray, attributeStatArray));
}

class Attribute_AttributeDeterminedDiceMod extends Record {
    constructor(name, attributesToEffect, dicePoolModification) {
        super();
        this.name = name;
        this.attributesToEffect = attributesToEffect;
        this.dicePoolModification = dicePoolModification;
    }
}

function Attribute_AttributeDeterminedDiceMod_$reflection() {
    return record_type("FallenLib.Attribute.AttributeDeterminedDiceMod", [], Attribute_AttributeDeterminedDiceMod, () => [["name", string_type], ["attributesToEffect", array_type(string_type)], ["dicePoolModification", Dice_DicePoolModification_$reflection()]]);
}

function Attribute_determineAttributeDeterminedDiceMod(governingAttributeOfSkill, attributeDeterminedDiceModArray) {
    return map$1((attributeDeterminedDiceMod_1) => attributeDeterminedDiceMod_1.dicePoolModification, attributeDeterminedDiceModArray.filter((attributeDeterminedDiceMod) => attributeDeterminedDiceMod.attributesToEffect.some((attribute) => contains$1(attribute, governingAttributeOfSkill, {
        Equals: (x, y) => (x === y),
        GetHashCode: stringHash,
    }))));
}

class Range_CalculatedRange extends Record {
    constructor(desc, effectiveRange, maxRange) {
        super();
        this.desc = desc;
        this.effectiveRange = effectiveRange;
        this.maxRange = maxRange;
    }
}

function Range_CalculatedRange_$reflection() {
    return record_type("FallenLib.Range.CalculatedRange", [], Range_CalculatedRange, () => [["desc", string_type], ["effectiveRange", uint32_type], ["maxRange", uint32_type]]);
}

class Range_RangeCalculation extends Record {
    constructor(desc, numDicePerEffectiveRangeUnit, ftPerEffectiveRangeUnit, roundEffectiveRangeUp, maxRange) {
        super();
        this.desc = desc;
        this.numDicePerEffectiveRangeUnit = numDicePerEffectiveRangeUnit;
        this.ftPerEffectiveRangeUnit = ftPerEffectiveRangeUnit;
        this.roundEffectiveRangeUp = roundEffectiveRangeUp;
        this.maxRange = maxRange;
    }
}

function Range_RangeCalculation_$reflection() {
    return record_type("FallenLib.Range.RangeCalculation", [], Range_RangeCalculation, () => [["desc", string_type], ["numDicePerEffectiveRangeUnit", uint32_type], ["ftPerEffectiveRangeUnit", uint32_type], ["roundEffectiveRangeUp", bool_type], ["maxRange", uint32_type]]);
}

class Range_Range extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["CalculatedRange", "RangeCalculation"];
    }
}

function Range_Range_$reflection() {
    return union_type("FallenLib.Range.Range", [], Range_Range, () => [[["Item", Range_CalculatedRange_$reflection()]], [["Item", Range_RangeCalculation_$reflection()]]]);
}

function Range_calculatedRangeToString(calculatedRange) {
    return toText(printf("%u/%u"))(calculatedRange.effectiveRange)(calculatedRange.maxRange);
}

function Range_calculateRange(numDice, rangeCalculation) {
    return new Range_CalculatedRange(rangeCalculation.desc, (Math.ceil(numDice / rangeCalculation.numDicePerEffectiveRangeUnit) >>> 0) * rangeCalculation.ftPerEffectiveRangeUnit, rangeCalculation.maxRange);
}

function Range_rangeToCalculatedRange(numDice, range) {
    if (range.tag === 1) {
        return Range_calculateRange(numDice, range.fields[0]);
    }
    else {
        return range.fields[0];
    }
}

function Range_determineGreatestRange(numDice, primaryRange, optionalRange) {
    if (optionalRange == null) {
        return Range_rangeToCalculatedRange(numDice, primaryRange);
    }
    else {
        const secondaryRange = optionalRange;
        const calculatedPrimaryRange = Range_rangeToCalculatedRange(numDice, primaryRange);
        const calculatedSecondaryRange = Range_rangeToCalculatedRange(numDice, secondaryRange);
        if (calculatedPrimaryRange.effectiveRange >= calculatedSecondaryRange.effectiveRange) {
            return calculatedPrimaryRange;
        }
        else {
            return calculatedSecondaryRange;
        }
    }
}

function Range_createPenerationFromCalculatedRange(tuple_, tuple__1, tuple__2) {
    const tuple = [tuple_, tuple__1, tuple__2];
    return new Range_Range(0, [new Range_CalculatedRange(tuple[0], tuple[1], tuple[2])]);
}

function Range_createPenerationFromRangeCalculation(tuple_, tuple__1, tuple__2, tuple__3, tuple__4) {
    const tuple = [tuple_, tuple__1, tuple__2, tuple__3, tuple__4];
    return new Range_Range(1, [new Range_RangeCalculation(tuple[0], tuple[1], tuple[2], tuple[3], tuple[4])]);
}

const Range_createCalculatedRangeMap = (list) => MapUtils_createMapFromTuple3List((tupledArg) => Range_createPenerationFromCalculatedRange(tupledArg[0], tupledArg[1], tupledArg[2]), list);

const Range_createRangeCalculationMap = (list) => MapUtils_createMapFromTuple5List((tupledArg) => Range_createPenerationFromRangeCalculation(tupledArg[0], tupledArg[1], tupledArg[2], tupledArg[3], tupledArg[4]), list);

function Range_createRangeMap(calculatedRangeData, rangeCalculationData) {
    return fold((acc, key, value) => add(key, value, acc), Range_createCalculatedRangeMap(calculatedRangeData), Range_createRangeCalculationMap(rangeCalculationData));
}

class AreaOfEffect_AreaOfEffect extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Cone", "Sphere"];
    }
}

function AreaOfEffect_AreaOfEffect_$reflection() {
    return union_type("FallenLib.AreaOfEffect.AreaOfEffect", [], AreaOfEffect_AreaOfEffect, () => [[], []]);
}

const AreaOfEffect_AreaOfEffectOptionMap = ofSeq([["Cone", new AreaOfEffect_AreaOfEffect(0, [])], ["Sphere", new AreaOfEffect_AreaOfEffect(1, [])], ["None", void 0]], {
    Compare: comparePrimitives,
});

class Shape_ConeShape extends Record {
    constructor(area, distance, angle) {
        super();
        this.area = area;
        this.distance = distance;
        this.angle = angle;
    }
}

function Shape_ConeShape_$reflection() {
    return record_type("FallenLib.Shape.ConeShape", [], Shape_ConeShape, () => [["area", float64_type], ["distance", uint32_type], ["angle", float64_type]]);
}

class Shape_SphereShape extends Record {
    constructor(area, radius) {
        super();
        this.area = area;
        this.radius = radius;
    }
}

function Shape_SphereShape_$reflection() {
    return record_type("FallenLib.Shape.SphereShape", [], Shape_SphereShape, () => [["area", float64_type], ["radius", float64_type]]);
}

class Shape_Shape extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ConeToConeShape", "SphereToSphereShape"];
    }
}

function Shape_Shape_$reflection() {
    return union_type("FallenLib.Shape.Shape", [], Shape_Shape, () => [[["Item", Shape_ConeShape_$reflection()]], [["Item", Shape_SphereShape_$reflection()]]]);
}

function Shape_shapeToString(shape) {
    if (shape.tag === 1) {
        const sphereShape = shape.fields[0];
        const decimalLimitedArea_1 = format('{0:' + ("F" + int32ToString(1)) + '}', sphereShape.area);
        const decimalLimitedRadius = format('{0:' + ("F" + int32ToString(1)) + '}', sphereShape.radius);
        return toText(printf("area: %s ft^2, radius: %s ft"))(decimalLimitedArea_1)(decimalLimitedRadius);
    }
    else {
        const coneShape = shape.fields[0];
        const decimalLimitedArea = format('{0:' + ("F" + int32ToString(1)) + '}', coneShape.area);
        const decimalLimitedAngle = format('{0:' + ("F" + int32ToString(1)) + '}', coneShape.angle);
        return toText(printf("area: %s ft^2, distance: %u ft, angle: %s θ"))(decimalLimitedArea)(coneShape.distance)(decimalLimitedAngle);
    }
}

function Shape_shapeOptionToString(shapeOption) {
    if (shapeOption == null) {
        return "";
    }
    else {
        return Shape_shapeToString(shapeOption);
    }
}

function Shape_calcConeArea(distance, angle) {
    return (distance * distance) * Math.tan(angle / 2);
}

function Shape_calcConeDistance(area, angle) {
    return Math.sqrt(area / Math.tan(angle / 2)) >>> 0;
}

function Shape_calcConeAngle(area, distance) {
    return 2 * Math.atan(Math.sqrt(area / (distance * distance)));
}

function Shape_calcCone(numDice) {
    const distance = numDice * 5;
    return new Shape_ConeShape(Shape_calcConeArea(distance, 53), distance, 53);
}

function Shape_calcCircle(numDice) {
    const radius = 2.5 * numDice;
    return new Shape_SphereShape((2 * 3.141592653589793) * Math.pow(radius, 2), radius);
}

function Shape_calcShape(numDice, aoe) {
    if (aoe.tag === 1) {
        return new Shape_Shape(1, [Shape_calcCircle(numDice)]);
    }
    else {
        return new Shape_Shape(0, [Shape_calcCone(numDice)]);
    }
}

function Shape_determineAOE(numDice, aoe) {
    if (aoe == null) {
        return void 0;
    }
    else {
        return Shape_calcShape(numDice, aoe);
    }
}

function Shape_compareAndDetermineAOE(numDice, aoe, resourceAOE) {
    if (resourceAOE == null) {
        return Shape_determineAOE(numDice, aoe);
    }
    else {
        return Shape_calcShape(numDice, resourceAOE);
    }
}

class WeaponResourceClass_WeaponResourceClass extends Record {
    constructor(name, resourceClass, resourceDice, penetration, range, damageTypes, areaOfEffect) {
        super();
        this.name = name;
        this.resourceClass = resourceClass;
        this.resourceDice = resourceDice;
        this.penetration = penetration;
        this.range = range;
        this.damageTypes = damageTypes;
        this.areaOfEffect = areaOfEffect;
    }
}

function WeaponResourceClass_WeaponResourceClass_$reflection() {
    return record_type("FallenLib.WeaponResourceClass.WeaponResourceClass", [], WeaponResourceClass_WeaponResourceClass, () => [["name", string_type], ["resourceClass", string_type], ["resourceDice", Dice_DicePoolModification_$reflection()], ["penetration", uint32_type], ["range", option_type(Range_Range_$reflection())], ["damageTypes", array_type(string_type)], ["areaOfEffect", option_type(AreaOfEffect_AreaOfEffect_$reflection())]]);
}

function WeaponResourceClass_determineResource(resource) {
    if (resource == null) {
        return ["", Dice_createD6DicePoolMod(0), 0, void 0, [], void 0];
    }
    else {
        const resource_1 = resource;
        return [(" (" + resource_1.name) + ")", resource_1.resourceDice, resource_1.penetration, resource_1.range, resource_1.damageTypes, resource_1.areaOfEffect];
    }
}

class WeaponClass_WeaponClass extends Record {
    constructor(desc, oneHandedWeaponDice, twoHandedWeaponDice, penetration, range, damageTypes, engageableOpponents, dualWieldableBonus, areaOfEffect, resourceClass, governingAttributes) {
        super();
        this.desc = desc;
        this.oneHandedWeaponDice = oneHandedWeaponDice;
        this.twoHandedWeaponDice = twoHandedWeaponDice;
        this.penetration = penetration;
        this.range = range;
        this.damageTypes = damageTypes;
        this.engageableOpponents = engageableOpponents;
        this.dualWieldableBonus = dualWieldableBonus;
        this.areaOfEffect = areaOfEffect;
        this.resourceClass = resourceClass;
        this.governingAttributes = governingAttributes;
    }
}

function WeaponClass_WeaponClass_$reflection() {
    return record_type("FallenLib.WeaponClass.WeaponClass", [], WeaponClass_WeaponClass, () => [["desc", string_type], ["oneHandedWeaponDice", option_type(Dice_DicePoolModification_$reflection())], ["twoHandedWeaponDice", Dice_DicePoolModification_$reflection()], ["penetration", Penetration_Penetration_$reflection()], ["range", Range_Range_$reflection()], ["damageTypes", array_type(string_type)], ["engageableOpponents", EngageableOpponents_EngageableOpponents_$reflection()], ["dualWieldableBonus", option_type(Dice_DicePoolModification_$reflection())], ["areaOfEffect", option_type(AreaOfEffect_AreaOfEffect_$reflection())], ["resourceClass", option_type(string_type)], ["governingAttributes", array_type(string_type)]]);
}

class ItemTier_ItemTier extends Record {
    constructor(desc, level, runeSlots, baseDice, durabilityMax) {
        super();
        this.desc = desc;
        this.level = (level | 0);
        this.runeSlots = runeSlots;
        this.baseDice = baseDice;
        this.durabilityMax = durabilityMax;
    }
}

function ItemTier_ItemTier_$reflection() {
    return record_type("FallenLib.ItemTier.ItemTier", [], ItemTier_ItemTier, () => [["desc", string_type], ["level", int32_type], ["runeSlots", uint32_type], ["baseDice", Dice_DicePool_$reflection()], ["durabilityMax", uint32_type]]);
}

class ConduitClass_ConduitClass extends Record {
    constructor(desc, oneHandedDice, twoHandedDice, penetration, rangeAdjustment, damageTypes, engageableOpponents, dualWieldableBonus, areaOfEffect, resourceClass, governingAttributes) {
        super();
        this.desc = desc;
        this.oneHandedDice = oneHandedDice;
        this.twoHandedDice = twoHandedDice;
        this.penetration = penetration;
        this.rangeAdjustment = (rangeAdjustment | 0);
        this.damageTypes = damageTypes;
        this.engageableOpponents = engageableOpponents;
        this.dualWieldableBonus = dualWieldableBonus;
        this.areaOfEffect = areaOfEffect;
        this.resourceClass = resourceClass;
        this.governingAttributes = governingAttributes;
    }
}

function ConduitClass_ConduitClass_$reflection() {
    return record_type("FallenLib.ConduitClass.ConduitClass", [], ConduitClass_ConduitClass, () => [["desc", string_type], ["oneHandedDice", option_type(Dice_DicePoolModification_$reflection())], ["twoHandedDice", Dice_DicePoolModification_$reflection()], ["penetration", Penetration_Penetration_$reflection()], ["rangeAdjustment", int32_type], ["damageTypes", array_type(string_type)], ["engageableOpponents", option_type(EngageableOpponents_EngageableOpponents_$reflection())], ["dualWieldableBonus", option_type(Dice_DicePoolModification_$reflection())], ["areaOfEffect", option_type(AreaOfEffect_AreaOfEffect_$reflection())], ["resourceClass", option_type(string_type)], ["governingAttributes", array_type(string_type)]]);
}

class DefenseClass_DefenseClass extends Record {
    constructor(name, physicalDefense, mentalDefense, spiritualDefense) {
        super();
        this.name = name;
        this.physicalDefense = physicalDefense;
        this.mentalDefense = mentalDefense;
        this.spiritualDefense = spiritualDefense;
    }
}

function DefenseClass_DefenseClass_$reflection() {
    return record_type("FallenLib.DefenseClass.DefenseClass", [], DefenseClass_DefenseClass, () => [["name", string_type], ["physicalDefense", float64_type], ["mentalDefense", float64_type], ["spiritualDefense", float64_type]]);
}

function DefenseClass_tupleToDefenseClass(name, physicalDefense, mentalDefense, spiritualDefense) {
    return new DefenseClass_DefenseClass(name, physicalDefense, mentalDefense, spiritualDefense);
}

class Item_ItemClass extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["WeaponClass", "ConduitClass", "WeaponResourceClass", "DefenseClass"];
    }
}

function Item_ItemClass_$reflection() {
    return union_type("FallenLib.Item.ItemClass", [], Item_ItemClass, () => [[["Item", WeaponClass_WeaponClass_$reflection()]], [["Item", ConduitClass_ConduitClass_$reflection()]], [["Item", WeaponResourceClass_WeaponResourceClass_$reflection()]], [["Item", DefenseClass_DefenseClass_$reflection()]]]);
}

class Item_Item extends Record {
    constructor(name, itemClasses, itemTier, value, weight) {
        super();
        this.name = name;
        this.itemClasses = itemClasses;
        this.itemTier = itemTier;
        this.value = value;
        this.weight = weight;
    }
}

function Item_Item_$reflection() {
    return record_type("FallenLib.Item.Item", [], Item_Item, () => [["name", string_type], ["itemClasses", array_type(Item_ItemClass_$reflection())], ["itemTier", ItemTier_ItemTier_$reflection()], ["value", string_type], ["weight", float64_type]]);
}

function Item_collectWeaponItemClasses(item) {
    return collect((itemClass) => {
        if (itemClass.tag === 0) {
            return [itemClass.fields[0]];
        }
        else {
            return [];
        }
    }, item.itemClasses);
}

function Item_collectConduitClasses(item) {
    return collect((itemClass) => {
        if (itemClass.tag === 1) {
            return [itemClass.fields[0]];
        }
        else {
            return [];
        }
    }, item.itemClasses);
}

function Item_collectWeaponResourceItemClasses(item) {
    return collect((itemClass) => {
        if (itemClass.tag === 2) {
            return [itemClass.fields[0]];
        }
        else {
            return [];
        }
    }, item.itemClasses);
}

function Item_collectDefenseClasses(item) {
    return collect((itemClass) => {
        if (itemClass.tag === 3) {
            return [itemClass.fields[0]];
        }
        else {
            return [];
        }
    }, item.itemClasses);
}

class MagicResource_MagicResource extends Record {
    constructor(magicResouceClass, numMagicResourceDice) {
        super();
        this.magicResouceClass = magicResouceClass;
        this.numMagicResourceDice = numMagicResourceDice;
    }
}

function MagicResource_MagicResource_$reflection() {
    return record_type("FallenLib.MagicResource.MagicResource", [], MagicResource_MagicResource, () => [["magicResouceClass", string_type], ["numMagicResourceDice", uint32_type]]);
}

function MagicResource_determineMagicResource(resource) {
    return [toText(printf("( %u %s )"))(resource.numMagicResourceDice)(resource.magicResouceClass), Dice_createD6DicePoolMod(resource.numMagicResourceDice)];
}

class MagicResource_ResourcePool extends Record {
    constructor(name, remainingResources, poolMax) {
        super();
        this.name = name;
        this.remainingResources = remainingResources;
        this.poolMax = poolMax;
    }
}

function MagicResource_ResourcePool_$reflection() {
    return record_type("FallenLib.MagicResource.ResourcePool", [], MagicResource_ResourcePool, () => [["name", string_type], ["remainingResources", uint32_type], ["poolMax", uint32_type]]);
}

class MagicSkill_MagicSkill extends Record {
    constructor(desc, damageTypes, rangeAdjustment, meleeCapable, magicResourceClass) {
        super();
        this.desc = desc;
        this.damageTypes = damageTypes;
        this.rangeAdjustment = (rangeAdjustment | 0);
        this.meleeCapable = meleeCapable;
        this.magicResourceClass = magicResourceClass;
    }
}

function MagicSkill_MagicSkill_$reflection() {
    return record_type("FallenLib.MagicSkill.MagicSkill", [], MagicSkill_MagicSkill, () => [["desc", string_type], ["damageTypes", array_type(string_type)], ["rangeAdjustment", int32_type], ["meleeCapable", bool_type], ["magicResourceClass", string_type]]);
}

class MagicCombat_MagicCombat extends Record {
    constructor(desc, lvlRequirment, diceModification, penetration, range, engageableOpponents, minResourceRequirment, canVocationAssist, areaOfEffect) {
        super();
        this.desc = desc;
        this.lvlRequirment = lvlRequirment;
        this.diceModification = diceModification;
        this.penetration = penetration;
        this.range = range;
        this.engageableOpponents = engageableOpponents;
        this.minResourceRequirment = minResourceRequirment;
        this.canVocationAssist = canVocationAssist;
        this.areaOfEffect = areaOfEffect;
    }
}

function MagicCombat_MagicCombat_$reflection() {
    return record_type("FallenLib.MagicCombat.MagicCombat", [], MagicCombat_MagicCombat, () => [["desc", string_type], ["lvlRequirment", Neg1To4_Neg1To4_$reflection()], ["diceModification", Dice_DicePoolModification_$reflection()], ["penetration", Penetration_Penetration_$reflection()], ["range", Range_Range_$reflection()], ["engageableOpponents", EngageableOpponents_EngageableOpponents_$reflection()], ["minResourceRequirment", uint32_type], ["canVocationAssist", bool_type], ["areaOfEffect", option_type(AreaOfEffect_AreaOfEffect_$reflection())]]);
}

function MagicCombat_determineMagicCombatTypes(meleeCapable, lvl, magicCombatList) {
    let array;
    return map$1((magicCombat_2) => magicCombat_2.desc, (array = magicCombatList.filter((magicCombat) => (Neg1To4_convert_Neg1To4_To_Int(lvl) >= Neg1To4_convert_Neg1To4_To_Int(magicCombat.lvlRequirment))), array.filter((magicCombat_1) => {
        if (((magicCombat_1.desc === "Melee") ? true : (magicCombat_1.desc === "Melee Trick")) && !meleeCapable) {
            return false;
        }
        else {
            return true;
        }
    })));
}

class Container_Container extends Record {
    constructor(name, weightCapacity, weightContained, itemList) {
        super();
        this.name = name;
        this.weightCapacity = weightCapacity;
        this.weightContained = weightContained;
        this.itemList = itemList;
    }
}

function Container_Container_$reflection() {
    return record_type("FallenLib.Container.Container", [], Container_Container, () => [["name", string_type], ["weightCapacity", float64_type], ["weightContained", float64_type], ["itemList", list_type(Item_Item_$reflection())]]);
}

class Equipment_EquipmentItem extends Record {
    constructor(equipped, item, quantity) {
        super();
        this.equipped = equipped;
        this.item = item;
        this.quantity = quantity;
    }
}

function Equipment_EquipmentItem_$reflection() {
    return record_type("FallenLib.Equipment.EquipmentItem", [], Equipment_EquipmentItem, () => [["equipped", bool_type], ["item", Item_Item_$reflection()], ["quantity", uint32_type]]);
}

function Equipment_tupleToEquipmentItem(itemMap, equipped, desc, quantity) {
    return new Equipment_EquipmentItem(equipped, FSharpMap__get_Item(itemMap, desc), quantity);
}

function Equipment_calculateEquipmentItemArrayWeight(equipmentArray) {
    return fold$3((acc, equipmentItem) => ((equipmentItem.item.weight * equipmentItem.quantity) + acc), 0, equipmentArray);
}

function Equipment_getEquipedItems(equipment) {
    return map$1((equipmentItem_1) => equipmentItem_1.item, equipment.filter((equipmentItem) => ((equipmentItem.equipped === true) && (equipmentItem.quantity > 0))));
}

function Equipment_getEquipedConduitItemsWithSkillName(equipment, skillName) {
    const array_2 = Equipment_getEquipedItems(equipment);
    return array_2.filter((item) => {
        let array_1, array;
        return !((array_1 = ((array = Item_collectConduitClasses(item), array.filter((conduitClass) => (conduitClass.desc.indexOf(skillName) >= 0)))), array_1.length === 0));
    });
}

class SkillStat_SkillStat extends Record {
    constructor(name, lvl, governingAttribute) {
        super();
        this.name = name;
        this.lvl = lvl;
        this.governingAttribute = governingAttribute;
    }
}

function SkillStat_SkillStat_$reflection() {
    return record_type("FallenLib.SkillStat.SkillStat", [], SkillStat_SkillStat, () => [["name", string_type], ["lvl", Neg1To4_Neg1To4_$reflection()], ["governingAttribute", array_type(string_type)]]);
}

function SkillStat_tupleToSkillStat(attributeMap, name, lvl, governingAttribute) {
    return new SkillStat_SkillStat(name, Neg1To4_intToNeg1To4(lvl), singleton$1(FSharpMap__get_Item(attributeMap, governingAttribute)));
}

function SkillStat_findSkillStat(skillName, skillStatArray) {
    const list = skillStatArray.filter((skill) => (skill.name === skillName));
    if (list.length === 0) {
        return new SkillStat_SkillStat(skillName, new Neg1To4_Neg1To4(1, []), []);
    }
    else {
        return maxBy((skill_1) => skill_1.lvl, list, {
            Compare: compare$1,
        });
    }
}

function SkillStat_skillStatLvlToInt(skillStat) {
    return Neg1To4_convert_Neg1To4_To_Int(skillStat.lvl);
}

class SkillRoll_SkillRoll extends Record {
    constructor(desc, dicePool, lvl) {
        super();
        this.desc = desc;
        this.dicePool = dicePool;
        this.lvl = lvl;
    }
}

function SkillRoll_SkillRoll_$reflection() {
    return record_type("FallenLib.SkillRoll.SkillRoll", [], SkillRoll_SkillRoll, () => [["desc", string_type], ["dicePool", Dice_DicePool_$reflection()], ["lvl", Neg1To4_Neg1To4_$reflection()]]);
}

function SkillRoll_matchAttributeDiceWithSkillDice(skillStat, attributeStats) {
    return Dice_intToDicePoolModification(sumBy((attributeStat_1) => Neg1To4_convert_Neg1To4_To_Int(attributeStat_1.lvl), attributeStats.filter((attributeStat) => skillStat.governingAttribute.some((skillGoverningAttribute) => (attributeStat.attribute === skillGoverningAttribute))), {
        GetZero: () => 0,
        Add: (x, y) => (x + y),
    }));
}

function SkillRoll_skillStatToSkillRoll(skillStat, attributeStats, baseDice, attributeDeterminedDiceModArray) {
    let array_1;
    return new SkillRoll_SkillRoll(skillStat.name, Dice_modifyDicePoolByModList(baseDice, (array_1 = Attribute_determineAttributeDeterminedDiceMod(skillStat.governingAttribute, attributeDeterminedDiceModArray), append([Dice_intToDicePoolModification(Neg1To4_convert_Neg1To4_To_Int(skillStat.lvl)), SkillRoll_matchAttributeDiceWithSkillDice(skillStat, attributeStats)], array_1))), skillStat.lvl);
}

function SkillRoll_skillStatsToSkillRolls(skillStats, attributeStats, baseDice, attributeDeterminedDiceModArray) {
    return map$1((skillStat) => SkillRoll_skillStatToSkillRoll(skillStat, attributeStats, baseDice, attributeDeterminedDiceModArray), skillStats);
}

class VocationStat_VocationStat extends Record {
    constructor(name, lvl, governingAttributes, vocationalSkills) {
        super();
        this.name = name;
        this.lvl = lvl;
        this.governingAttributes = governingAttributes;
        this.vocationalSkills = vocationalSkills;
    }
}

function VocationStat_VocationStat_$reflection() {
    return record_type("FallenLib.VocationStat.VocationStat", [], VocationStat_VocationStat, () => [["name", string_type], ["lvl", Neg1To4_Neg1To4_$reflection()], ["governingAttributes", array_type(string_type)], ["vocationalSkills", array_type(SkillStat_SkillStat_$reflection())]]);
}

function VocationStat_findVocationalSkill(vocations, vocationalSkillName) {
    return SkillStat_findSkillStat(vocationalSkillName, collect((x) => x, map$1((vocation) => vocation.vocationalSkills, vocations)));
}

class VocationRoll_VocationRoll extends Record {
    constructor(name, vocationDicePool, vocationalSkills) {
        super();
        this.name = name;
        this.vocationDicePool = vocationDicePool;
        this.vocationalSkills = vocationalSkills;
    }
}

function VocationRoll_VocationRoll_$reflection() {
    return record_type("FallenLib.VocationRoll.VocationRoll", [], VocationRoll_VocationRoll, () => [["name", string_type], ["vocationDicePool", Dice_DicePool_$reflection()], ["vocationalSkills", array_type(SkillRoll_SkillRoll_$reflection())]]);
}

function VocationRoll_determineVocationAttributeDiceMod(vocationStat, attributeStats) {
    return Dice_intToDicePoolModification(sumBy((attributeStat_1) => Neg1To4_convert_Neg1To4_To_Int(attributeStat_1.lvl), attributeStats.filter((attributeStat) => vocationStat.governingAttributes.some((vocationGoverningAttribute) => (attributeStat.attribute === vocationGoverningAttribute))), {
        GetZero: () => 0,
        Add: (x, y) => (x + y),
    }));
}

function VocationRoll_vocationStatToVocationRoll(vocationStat, attributeStats, baseDice, attributeDeterminedDiceModArray) {
    let array_1;
    return new VocationRoll_VocationRoll(vocationStat.name, Dice_modifyDicePoolByModList(baseDice, (array_1 = Attribute_determineAttributeDeterminedDiceMod(vocationStat.governingAttributes, attributeDeterminedDiceModArray), append([VocationRoll_determineVocationAttributeDiceMod(vocationStat, attributeStats), Dice_intToDicePoolModification(Neg1To4_convert_Neg1To4_To_Int(vocationStat.lvl))], array_1))), SkillRoll_skillStatsToSkillRolls(vocationStat.vocationalSkills, attributeStats, baseDice, attributeDeterminedDiceModArray));
}

class CombatRoll_CombatRoll extends Record {
    constructor(desc, combatRoll, calculatedRange, penetration, damageTypes, areaOfEffectShape, engageableOpponents) {
        super();
        this.desc = desc;
        this.combatRoll = combatRoll;
        this.calculatedRange = calculatedRange;
        this.penetration = penetration;
        this.damageTypes = damageTypes;
        this.areaOfEffectShape = areaOfEffectShape;
        this.engageableOpponents = engageableOpponents;
    }
}

function CombatRoll_CombatRoll_$reflection() {
    return record_type("FallenLib.CombatRoll.CombatRoll", [], CombatRoll_CombatRoll, () => [["desc", string_type], ["combatRoll", Dice_DicePool_$reflection()], ["calculatedRange", Range_CalculatedRange_$reflection()], ["penetration", uint32_type], ["damageTypes", array_type(string_type)], ["areaOfEffectShape", option_type(Shape_Shape_$reflection())], ["engageableOpponents", uint32_type]]);
}

function CombatRoll_combatRollToStringArray(combatRoll) {
    return [combatRoll.desc, Dice_dicePoolToString(combatRoll.combatRoll), combatRoll.penetration.toString(), ((Range_calculatedRangeToString(combatRoll.calculatedRange) + " ft (") + combatRoll.calculatedRange.desc) + ")", Damage_damageTypesToString(combatRoll.damageTypes), combatRoll.engageableOpponents.toString(), Shape_shapeOptionToString(combatRoll.areaOfEffectShape)];
}

function CombatRoll_combatRollsToStringArrays(combatRolls) {
    return map$1(CombatRoll_combatRollToStringArray, combatRolls);
}

function WeaponCombatRoll_createCombatRoll(desc, weaponClass, weaponTierBaseDice, attributeDeterminedDiceModArray, attributeStats, skillStatLvl, resource, descSuffix, wieldingDiceMods) {
    let array_2;
    const patternInput = WeaponResourceClass_determineResource(resource);
    const dicePool = Dice_modifyDicePoolByModList(weaponTierBaseDice, (array_2 = append(wieldingDiceMods, Attribute_determineAttributeDeterminedDiceMod(weaponClass.governingAttributes, attributeDeterminedDiceModArray)), append([Attribute_determineAttributeDiceMod(weaponClass.governingAttributes, attributeStats), Dice_intToDicePoolModification(Neg1To4_convert_Neg1To4_To_Int(skillStatLvl)), patternInput[1]], array_2)));
    const numDice = Dice_sumDicePool(dicePool);
    return new CombatRoll_CombatRoll((desc + patternInput[0]) + descSuffix, dicePool, Range_determineGreatestRange(numDice, weaponClass.range, patternInput[3]), Penetration_determinePenetration(numDice, weaponClass.penetration, new Penetration_Penetration(1, [patternInput[2]])), append(weaponClass.damageTypes, patternInput[4]), Shape_compareAndDetermineAOE(numDice, weaponClass.areaOfEffect, patternInput[5]), EngageableOpponents_determineEngageableOpponents(numDice, weaponClass.engageableOpponents));
}

function WeaponCombatRoll_createHandedVariationsCombatRolls(twoHandedWeaponDice, oneHandedWeaponDiceOption, dualWieldableBonusOption, preloadedCreateCombatRoll) {
    const twoHandedCombat = preloadedCreateCombatRoll(" (Two-handed)", [twoHandedWeaponDice]);
    if (oneHandedWeaponDiceOption != null) {
        const oneHandedWeaponDice = value(oneHandedWeaponDiceOption);
        const oneHandedCombat = preloadedCreateCombatRoll(" (One-handed)", [oneHandedWeaponDice]);
        const handedVariations = equals$1(oneHandedWeaponDice, twoHandedWeaponDice) ? [oneHandedCombat] : [twoHandedCombat, oneHandedCombat];
        if (dualWieldableBonusOption != null) {
            return append(handedVariations, singleton$1(preloadedCreateCombatRoll(" (Dual-wielded)", [oneHandedWeaponDice, value(dualWieldableBonusOption)])));
        }
        else {
            return handedVariations;
        }
    }
    else {
        return [twoHandedCombat];
    }
}

function WeaponCombatRoll_createWeaponCombatRollWithEquipmentList(equipment, attributeStats, vocationStats, attributeDeterminedDiceModArray) {
    return collect((weaponItem) => collect((weaponClass) => {
        const skillStat = VocationStat_findVocationalSkill(vocationStats, weaponClass.desc);
        const preloadedCreateHandVariationsCombatRolls = (preloadedCreateCombatRoll) => WeaponCombatRoll_createHandedVariationsCombatRolls(weaponClass.twoHandedWeaponDice, weaponClass.oneHandedWeaponDice, weaponClass.dualWieldableBonus, uncurry2(preloadedCreateCombatRoll));
        const preloadedCreateCombatRoll_1 = (resource, descSuffix, wieldingDiceMods) => WeaponCombatRoll_createCombatRoll(weaponItem.name, weaponClass, weaponItem.itemTier.baseDice, attributeDeterminedDiceModArray, attributeStats, skillStat.lvl, resource, descSuffix, wieldingDiceMods);
        const matchValue = weaponClass.resourceClass;
        if (matchValue == null) {
            return preloadedCreateHandVariationsCombatRolls(curry3(preloadedCreateCombatRoll_1)(void 0));
        }
        else {
            const resourceClass = matchValue;
            return collect((item) => {
                let array;
                return collect((weaponResourceClass) => preloadedCreateHandVariationsCombatRolls(curry3(preloadedCreateCombatRoll_1)(weaponResourceClass)), (array = Item_collectWeaponResourceItemClasses(item), array.filter((weaponResourceItem) => (weaponResourceItem.resourceClass === resourceClass))));
            }, Equipment_getEquipedItems(equipment));
        }
    }, Item_collectWeaponItemClasses(weaponItem)), Equipment_getEquipedItems(equipment));
}

function MagicCombatRoll_determineMagicRangedClass(rangeMap, lvl) {
    switch (lvl) {
        case 0:
            return FSharpMap__get_Item(rangeMap, "Short");
        case 1:
            return FSharpMap__get_Item(rangeMap, "Medium");
        case 2:
            return FSharpMap__get_Item(rangeMap, "Extended");
        case 3:
            return FSharpMap__get_Item(rangeMap, "Long");
        case 4:
            return FSharpMap__get_Item(rangeMap, "Sharpshooter");
        default:
            if (lvl >= 5) {
                return FSharpMap__get_Item(rangeMap, "Extreme");
            }
            else {
                return FSharpMap__get_Item(rangeMap, "Close");
            }
    }
}

function MagicCombatRoll_determineMagicRange(rangeMap, magicCombatName, lvl) {
    switch (magicCombatName) {
        case "Melee":
            return FSharpMap__get_Item(rangeMap, "Reach");
        case "Melee Trick":
            return FSharpMap__get_Item(rangeMap, "Melee");
        case "Ranged Trick":
            return FSharpMap__get_Item(rangeMap, "Short");
        default:
            return MagicCombatRoll_determineMagicRangedClass(rangeMap, lvl);
    }
}

function MagicCombatRoll_createMagicCombatRoll(magicResource, attributeStats, skillStat, magicSkill, magicCombatType, rangeMap, attributeDeterminedDiceModArray) {
    let array_1;
    const patternInput = MagicResource_determineMagicResource(magicResource);
    const range = MagicCombatRoll_determineMagicRange(rangeMap, magicCombatType.desc, Neg1To4_convert_Neg1To4_To_Int(skillStat.lvl));
    const combatRoll = Dice_modifyDicePoolByModList(Dice_baseDicePool, (array_1 = Attribute_determineAttributeDeterminedDiceMod(skillStat.governingAttribute, attributeDeterminedDiceModArray), append([Attribute_determineAttributeDiceMod(skillStat.governingAttribute, attributeStats), Dice_intToDicePoolModification(Neg1To4_convert_Neg1To4_To_Int(skillStat.lvl)), magicCombatType.diceModification, patternInput[1]], array_1)));
    const numDice = Dice_sumDicePool(combatRoll);
    return new CombatRoll_CombatRoll(toText(printf("%s %s %s"))(magicSkill.desc)(magicCombatType.desc)(patternInput[0]), combatRoll, Range_rangeToCalculatedRange(numDice, range), Penetration_calculatePenetration(numDice, magicCombatType.penetration), magicSkill.damageTypes, Shape_determineAOE(numDice, magicCombatType.areaOfEffect), EngageableOpponents_determineEngageableOpponents(numDice, magicCombatType.engageableOpponents));
}

function MagicCombatRoll_createMagicCombatRollWithConduit(rangeMap, magicResource, attributeStats, skillStatLvl, magicSkill, magicCombatType, conduit, conduitItemDesc, conduitTierBaseDice, attributeDeterminedDiceModArray, descSuffix, wieldingDiceMods) {
    let array_2;
    const patternInput = MagicResource_determineMagicResource(magicResource);
    const skillStatLvlAsInt = Neg1To4_convert_Neg1To4_To_Int(skillStatLvl) | 0;
    const range = MagicCombatRoll_determineMagicRange(rangeMap, magicCombatType.desc, skillStatLvlAsInt + conduit.rangeAdjustment);
    const damageTypes = append(magicSkill.damageTypes, conduit.damageTypes);
    let engageableOpponents;
    const matchValue = conduit.engageableOpponents;
    engageableOpponents = ((matchValue == null) ? magicCombatType.engageableOpponents : matchValue);
    const dicePool = Dice_modifyDicePoolByModList(conduitTierBaseDice, (array_2 = append(wieldingDiceMods, Attribute_determineAttributeDeterminedDiceMod(conduit.governingAttributes, attributeDeterminedDiceModArray)), append([Attribute_determineAttributeDiceMod(conduit.governingAttributes, attributeStats), Dice_intToDicePoolModification(skillStatLvlAsInt), magicCombatType.diceModification, patternInput[1]], array_2)));
    const numDice = Dice_sumDicePool(dicePool);
    return new CombatRoll_CombatRoll(toText(printf("%s %s with %s %s %s"))(magicSkill.desc)(magicCombatType.desc)(conduitItemDesc)(patternInput[0])(descSuffix), dicePool, Range_rangeToCalculatedRange(numDice, range), Penetration_determinePenetration(numDice, magicCombatType.penetration, conduit.penetration), damageTypes, Shape_compareAndDetermineAOE(numDice, magicCombatType.areaOfEffect, conduit.areaOfEffect), EngageableOpponents_determineEngageableOpponents(numDice, engageableOpponents));
}

function MagicCombatRoll_createMagicCombatRollWithConduitHandVariations(conduit, preloadedCreatMagicCombatRollWithConduit) {
    const twoHandedCombatRoll = preloadedCreatMagicCombatRollWithConduit(" (Two-handed)", [conduit.twoHandedDice]);
    const matchValue = conduit.oneHandedDice;
    if (matchValue != null) {
        const oneHandedDice = matchValue;
        const oneHandedCombatRoll = preloadedCreatMagicCombatRollWithConduit(" (One-handed)", [oneHandedDice]);
        const handedVariations = equals$1(conduit.twoHandedDice, oneHandedDice) ? [oneHandedCombatRoll] : [twoHandedCombatRoll, oneHandedCombatRoll];
        const matchValue_1 = conduit.dualWieldableBonus;
        if (matchValue_1 != null) {
            return append(handedVariations, singleton$1(preloadedCreatMagicCombatRollWithConduit(" (Dual-wielded)", [oneHandedDice, matchValue_1])));
        }
        else {
            return handedVariations;
        }
    }
    else {
        return [twoHandedCombatRoll];
    }
}

function MagicCombatRoll_createMagicCombatRolls(attributeStats, vocationStats, magicSkillMap, magicCombatMap, equipment, rangeMap, attributeDeterminedDiceModArray) {
    const magicMapKeys = Array.from(FSharpMap__get_Keys(magicSkillMap));
    return collect((vocationStat) => collect((skillStat_1) => {
        const magicSkill = FSharpMap__get_Item(magicSkillMap, skillStat_1.name);
        return collect((magicCombatName) => {
            const magicCombatType = FSharpMap__get_Item(magicCombatMap, magicCombatName);
            const equipedConduits = Equipment_getEquipedConduitItemsWithSkillName(equipment, skillStat_1.name);
            const magicResource = new MagicResource_MagicResource(magicSkill.magicResourceClass, magicCombatType.minResourceRequirment);
            if (equipedConduits.length > 0) {
                return collect((conduitItem) => collect((conduitClass) => MagicCombatRoll_createMagicCombatRollWithConduitHandVariations(conduitClass, (descSuffix, wieldingDiceMods) => MagicCombatRoll_createMagicCombatRollWithConduit(rangeMap, magicResource, attributeStats, skillStat_1.lvl, magicSkill, magicCombatType, conduitClass, conduitItem.name, conduitItem.itemTier.baseDice, attributeDeterminedDiceModArray, descSuffix, wieldingDiceMods)), Item_collectConduitClasses(conduitItem)), equipedConduits);
            }
            else {
                return singleton$1(MagicCombatRoll_createMagicCombatRoll(magicResource, attributeStats, skillStat_1, magicSkill, magicCombatType, rangeMap, attributeDeterminedDiceModArray));
            }
        }, MagicCombat_determineMagicCombatTypes(magicSkill.meleeCapable, skillStat_1.lvl, toArray(FSharpMap__get_Values(magicCombatMap))));
    }, vocationStat.vocationalSkills.filter((skillStat) => contains$1(skillStat.name, magicMapKeys, {
        Equals: (x, y) => (x === y),
        GetHashCode: stringHash,
    }))), vocationStats);
}

class CarryWeightCalculation_CarryWeightCalculation extends Record {
    constructor(name, baseWeight, governingAttribute, weightIncreasePerAttribute, governingSkill, weightIncreasePerSkill) {
        super();
        this.name = name;
        this.baseWeight = baseWeight;
        this.governingAttribute = governingAttribute;
        this.weightIncreasePerAttribute = weightIncreasePerAttribute;
        this.governingSkill = governingSkill;
        this.weightIncreasePerSkill = weightIncreasePerSkill;
    }
}

function CarryWeightCalculation_CarryWeightCalculation_$reflection() {
    return record_type("FallenLib.CarryWeightCalculation.CarryWeightCalculation", [], CarryWeightCalculation_CarryWeightCalculation, () => [["name", string_type], ["baseWeight", uint32_type], ["governingAttribute", string_type], ["weightIncreasePerAttribute", uint32_type], ["governingSkill", string_type], ["weightIncreasePerSkill", uint32_type]]);
}

function CarryWeightCalculation_createCarryWeightCalculation(name, baseWeight, governingAttribute, weightIncreasePerAttribute, governingSkill, weightIncreasePerSkill) {
    return new CarryWeightCalculation_CarryWeightCalculation(name, baseWeight, governingAttribute, weightIncreasePerAttribute, governingSkill, weightIncreasePerSkill);
}

class CarryWeightCalculation_WeightClass extends Record {
    constructor(name, bottomPercent, topPercent, percentOfMovementSpeed) {
        super();
        this.name = name;
        this.bottomPercent = bottomPercent;
        this.topPercent = topPercent;
        this.percentOfMovementSpeed = percentOfMovementSpeed;
    }
}

function CarryWeightCalculation_WeightClass_$reflection() {
    return record_type("FallenLib.CarryWeightCalculation.WeightClass", [], CarryWeightCalculation_WeightClass, () => [["name", string_type], ["bottomPercent", float64_type], ["topPercent", float64_type], ["percentOfMovementSpeed", float64_type]]);
}

function CarryWeightCalculation_tupleToWeightClass(name, bottomPercent, topPercent, percentOfMovementSpeed) {
    return new CarryWeightCalculation_WeightClass(name, bottomPercent, topPercent, percentOfMovementSpeed);
}

function CarryWeightCalculation_calculateMaxCarryWeight(maxCarryWeightCalculation, attributeStatArray, skillStatArray) {
    let y_1;
    return (y_1 = (((Attribute_determineAttributeLvl([maxCarryWeightCalculation.governingAttribute], attributeStatArray) * ~~maxCarryWeightCalculation.weightIncreasePerAttribute) + ~~maxCarryWeightCalculation.baseWeight) | 0), (SkillStat_skillStatLvlToInt(SkillStat_findSkillStat(maxCarryWeightCalculation.governingSkill, skillStatArray)) * ~~maxCarryWeightCalculation.weightIncreasePerSkill) + y_1);
}

class MovementSpeedCalculation_MovementSpeedCalculation extends Record {
    constructor(desc, baseMovementSpeed, governingAttributes, feetPerAttributeLvl, skillString, feetPerSkillLvl) {
        super();
        this.desc = desc;
        this.baseMovementSpeed = baseMovementSpeed;
        this.governingAttributes = governingAttributes;
        this.feetPerAttributeLvl = feetPerAttributeLvl;
        this.skillString = skillString;
        this.feetPerSkillLvl = feetPerSkillLvl;
    }
}

function MovementSpeedCalculation_MovementSpeedCalculation_$reflection() {
    return record_type("FallenLib.MovementSpeedCalculation.MovementSpeedCalculation", [], MovementSpeedCalculation_MovementSpeedCalculation, () => [["desc", string_type], ["baseMovementSpeed", uint32_type], ["governingAttributes", array_type(string_type)], ["feetPerAttributeLvl", uint32_type], ["skillString", string_type], ["feetPerSkillLvl", uint32_type]]);
}

function MovementSpeedCalculation_calculateMovementSpeed(movementSpeedCalculation, attributeLvl, skillLvl) {
    const matchValue = ((~~movementSpeedCalculation.baseMovementSpeed + (attributeLvl * ~~movementSpeedCalculation.feetPerAttributeLvl)) + (skillLvl * ~~movementSpeedCalculation.feetPerSkillLvl)) | 0;
    if (matchValue >= 0) {
        return matchValue >>> 0;
    }
    else {
        return 0;
    }
}

function MovementSpeedCalculation_createMovementSpeedString(movementSpeedCalculation, reflexLvl, athleticsLvl, percentOfMovementSpeed) {
    const scaledMovementSpeed = MovementSpeedCalculation_calculateMovementSpeed(movementSpeedCalculation, reflexLvl, athleticsLvl) * percentOfMovementSpeed;
    const arg = format('{0:' + ("F" + int32ToString(0)) + '}', scaledMovementSpeed);
    return toText(printf("%s ft"))(arg);
}

class Effects_Effect extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["MovementSpeedCalculation", "CarryWeightCalculation"];
    }
}

function Effects_Effect_$reflection() {
    return union_type("FallenLib.Effects.Effect", [], Effects_Effect, () => [[["Item", MovementSpeedCalculation_MovementSpeedCalculation_$reflection()]], [["Item", CarryWeightCalculation_CarryWeightCalculation_$reflection()]]]);
}

function Effects_descToEffect(movementSpeedMap, desc) {
    if (containsKey(desc, movementSpeedMap)) {
        return new Effects_Effect(0, [FSharpMap__get_Item(movementSpeedMap, desc)]);
    }
    else {
        return void 0;
    }
}

function Effects_effectToEffectString(effect, attributeStatArray, skillStatArray, weightClass) {
    if (effect.tag === 1) {
        return "Wrong path, fix this";
    }
    else {
        const calculation = effect.fields[0];
        return MovementSpeedCalculation_createMovementSpeedString(calculation, Attribute_determineAttributeLvl(calculation.governingAttributes, attributeStatArray), SkillStat_skillStatLvlToInt(SkillStat_findSkillStat(calculation.skillString, skillStatArray)), weightClass.percentOfMovementSpeed);
    }
}

function Effects_createCalculatedEffectTableArray(effectArray, attributeStatArray, skillStats, equipment, weightInfoTuple_, weightInfoTuple__1, weightInfoTuple__2) {
    const weightInfoTuple = [weightInfoTuple_, weightInfoTuple__1, weightInfoTuple__2];
    const weightClass = weightInfoTuple[0];
    return map$1((tuple) => {
        let arg, arg_1, arg_2, arg_3, arg_4;
        const effectOption = tuple[0];
        const desc = tuple[1];
        if (effectOption == null) {
            switch (desc) {
                case "Defense Level": {
                    const temp3 = fold$3((acc, tuple_1) => [acc[0] + tuple_1[0], acc[1] + tuple_1[1], acc[2] + tuple_1[2]], [0, 0, 0], collect((defenseClass) => [[defenseClass.physicalDefense, defenseClass.mentalDefense, defenseClass.spiritualDefense]], collect(Item_collectDefenseClasses, Equipment_getEquipedItems(equipment))));
                    return [desc, (arg = format('{0:' + ("F" + int32ToString(2)) + '}', temp3[0]), (arg_1 = format('{0:' + ("F" + int32ToString(2)) + '}', temp3[2]), (arg_2 = format('{0:' + ("F" + int32ToString(2)) + '}', temp3[1]), toText(printf("Physical: %s, Mental: %s, Spiritual: %s"))(arg)(arg_1)(arg_2)))), ""];
                }
                case "Inventory Weight":
                    return [desc, (arg_3 = format('{0:' + ("F" + int32ToString(2)) + '}', weightInfoTuple[1]), (arg_4 = format('{0:' + ("F" + int32ToString(2)) + '}', weightInfoTuple[2]), toText(printf("%s/%s lb (%s)"))(arg_3)(arg_4)(weightClass.name))), ""];
                default:
                    return ["", "", ""];
            }
        }
        else {
            return [desc, Effects_effectToEffectString(effectOption, attributeStatArray, skillStats, weightClass), tuple[3]];
        }
    }, effectArray);
}

class Character_Character extends Record {
    constructor(vocationRolls, coreSkillRolls, combatRolls, calculatedEffectTable) {
        super();
        this.vocationRolls = vocationRolls;
        this.coreSkillRolls = coreSkillRolls;
        this.combatRolls = combatRolls;
        this.calculatedEffectTable = calculatedEffectTable;
    }
}

function Character_Character_$reflection() {
    return record_type("FallenLib.Character.Character", [], Character_Character, () => [["vocationRolls", array_type(VocationRoll_VocationRoll_$reflection())], ["coreSkillRolls", array_type(SkillRoll_SkillRoll_$reflection())], ["combatRolls", array_type(CombatRoll_CombatRoll_$reflection())], ["calculatedEffectTable", array_type(tuple_type(string_type, string_type, string_type))]]);
}

function Character_createCharacter(skillStats, attributeStats, equipment, vocationData, magicSkillMap, magicCombatMap, rangeMap, effectOptionTupleArray, attributeDeterminedDicePoolModMap, carryWeightCalculation, weightClassData) {
    const totalWeight = Equipment_calculateEquipmentItemArrayWeight(equipment);
    const maxWeight = CarryWeightCalculation_calculateMaxCarryWeight(carryWeightCalculation, attributeStats, skillStats);
    const percentOfMaxWeight = totalWeight / maxWeight;
    const weightClass_1 = (maxWeight > 0) ? head$1(collect((weightClass) => {
        let n;
        return ((n = weightClass, (n.bottomPercent <= percentOfMaxWeight) && (percentOfMaxWeight < n.topPercent))) ? singleton$1(weightClass) : [];
    }, weightClassData)) : last(weightClassData);
    const attributeDeterminedDiceModArray = collect((tuple) => {
        const name = tuple[1];
        if (FSharpMap__ContainsKey(attributeDeterminedDicePoolModMap, name)) {
            return singleton$1(FSharpMap__get_Item(attributeDeterminedDicePoolModMap, name));
        }
        else if (name === "Inventory Weight") {
            return singleton$1(FSharpMap__get_Item(attributeDeterminedDicePoolModMap, weightClass_1.name));
        }
        else {
            return [];
        }
    }, effectOptionTupleArray);
    const weaponCombatRolls = WeaponCombatRoll_createWeaponCombatRollWithEquipmentList(equipment, attributeStats, vocationData, attributeDeterminedDiceModArray);
    const magicCombatRolls = MagicCombatRoll_createMagicCombatRolls(attributeStats, vocationData, magicSkillMap, magicCombatMap, equipment, rangeMap, attributeDeterminedDiceModArray);
    const calculatedEffectTable = Effects_createCalculatedEffectTableArray(effectOptionTupleArray, attributeStats, skillStats, equipment, weightClass_1, totalWeight, maxWeight);
    return new Character_Character(map$1((vocationStat) => VocationRoll_vocationStatToVocationRoll(vocationStat, attributeStats, Dice_stringToDicePool("3d6"), attributeDeterminedDiceModArray), vocationData), SkillRoll_skillStatsToSkillRolls(skillStats, attributeStats, Dice_stringToDicePool("3d6"), attributeDeterminedDiceModArray), append(weaponCombatRolls, magicCombatRolls), calculatedEffectTable);
}

class BuildRules_EffectMap extends Record {
    constructor(movementSpeedCalculationMap) {
        super();
        this.movementSpeedCalculationMap = movementSpeedCalculationMap;
    }
}

function BuildRules_EffectMap_$reflection() {
    return record_type("FallenLib.BuildRules.EffectMap", [], BuildRules_EffectMap, () => [["movementSpeedCalculationMap", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, MovementSpeedCalculation_MovementSpeedCalculation_$reflection()])]]);
}

function BuildRules_buildRules(damageTypeData, penetrationCalculationData, calculatedEngageableOpponentsData, engageableOpponentsCalculationData, calculatedRangeData, rangeCalculationData, resourceClassData, attributeData, magicSkillData, magicCombatData, weaponClassData, conduitClassData, itemTierData, itemData, weaponResourceClassData, equipmentData, skillStatData, attributeStatData, movementSpeedData, vocationDataArray, effectsTableData, defenseClassData, attributeDeterminedDiceModData, carryWeightCalculationData, weightClassData) {
    let tupledArg_12;
    let stringToDamageTypeArray;
    const damageTypeMap = TypeUtils_stringArrayToTypeMap(damageTypeData);
    stringToDamageTypeArray = ((damageTypesString) => Damage_stringAndMapToDamageTypeArray(damageTypeMap, damageTypesString));
    let penetrationMap;
    const penetrationCalculationMap = MapUtils_createMapFromTuple2List((tupledArg) => Penetration_tupleToPenetrationCalculation(tupledArg[0], tupledArg[1]), penetrationCalculationData);
    penetrationMap = ((str) => Penetration_createPenetrationMap(penetrationCalculationMap, str));
    let EOInterface;
    const calculatedEOMap = EngageableOpponents_createCalculatedEOMap(calculatedEngageableOpponentsData);
    const eoCalculationMap = EngageableOpponents_createEOCalculationMap(engageableOpponentsCalculationData);
    EOInterface = ((input) => EngageableOpponents_createEOInterface(calculatedEOMap, eoCalculationMap, input));
    const rangeMap = Range_createRangeMap(calculatedRangeData, rangeCalculationData);
    const resourceClassMap = TypeUtils_stringArrayToTypeMap(resourceClassData);
    const weaponResourceClassOptionMap = (string_1) => {
        if (string_1 === "None") {
            return void 0;
        }
        else {
            return FSharpMap__get_Item(resourceClassMap, string_1);
        }
    };
    const internalAttributeMap = TypeUtils_stringArrayToTypeMap(attributeData);
    const stringToAttributes = (arg_2) => map$1((attributeString) => FSharpMap__get_Item(internalAttributeMap, attributeString), split(filter((y) => (" " !== y), arg_2), [","], void 0, 1));
    const stringDescToAttributes = (inputString) => {
        if (inputString.indexOf("{") >= 0) {
            const removedBackCurly = split(last(split(inputString, ["{"], void 0, 1)), ["}"], void 0, 1);
            return stringToAttributes(removedBackCurly[0]);
        }
        else {
            return [];
        }
    };
    const magicSkillMap = MapUtils_createMapFromTuple5List((tupledArg_1) => (new MagicSkill_MagicSkill(tupledArg_1[0], stringToDamageTypeArray(tupledArg_1[1]), tupledArg_1[2], tupledArg_1[3], FSharpMap__get_Item(resourceClassMap, tupledArg_1[4]))), magicSkillData);
    const magicCombatMap = MapUtils_createMapFromTuple9List((tupledArg_2) => (new MagicCombat_MagicCombat(tupledArg_2[0], Neg1To4_intToNeg1To4(tupledArg_2[1]), Dice_stringToDicePoolModification(tupledArg_2[2]), penetrationMap(tupledArg_2[3]), FSharpMap__get_Item(rangeMap, tupledArg_2[4]), EOInterface(tupledArg_2[5]), tupledArg_2[6], tupledArg_2[7], FSharpMap__get_Item(AreaOfEffect_AreaOfEffectOptionMap, tupledArg_2[8]))), magicCombatData);
    const weaponClassMap = MapUtils_createMapFromTuple11List((tupledArg_3) => (new WeaponClass_WeaponClass(tupledArg_3[0], Dice_stringToDicePoolModificationOption(tupledArg_3[1]), Dice_stringToDicePoolModification(tupledArg_3[2]), penetrationMap(tupledArg_3[3]), FSharpMap__get_Item(rangeMap, tupledArg_3[4]), stringToDamageTypeArray(tupledArg_3[5]), EOInterface(tupledArg_3[6]), Dice_stringToDicePoolModificationOption(tupledArg_3[7]), FSharpMap__get_Item(AreaOfEffect_AreaOfEffectOptionMap, tupledArg_3[8]), weaponResourceClassOptionMap(tupledArg_3[9]), stringDescToAttributes(tupledArg_3[10]))), weaponClassData);
    const conduitClassMap = MapUtils_createMapFromTuple11List((tupledArg_4) => {
        const engageableOpponents_2 = tupledArg_4[6];
        return new ConduitClass_ConduitClass(tupledArg_4[0], Dice_stringToDicePoolModificationOption(tupledArg_4[1]), Dice_stringToDicePoolModification(tupledArg_4[2]), penetrationMap(tupledArg_4[3]), tupledArg_4[4], stringToDamageTypeArray(tupledArg_4[5]), (engageableOpponents_2 === "None") ? void 0 : EOInterface(engageableOpponents_2), Dice_stringToDicePoolModificationOption(tupledArg_4[7]), FSharpMap__get_Item(AreaOfEffect_AreaOfEffectOptionMap, tupledArg_4[8]), weaponResourceClassOptionMap(tupledArg_4[9]), stringDescToAttributes(tupledArg_4[10]));
    }, conduitClassData);
    const weaponResourceClassMap = MapUtils_createMapFromTuple7List((tupledArg_5) => {
        let string;
        return new WeaponResourceClass_WeaponResourceClass(tupledArg_5[0], FSharpMap__get_Item(resourceClassMap, tupledArg_5[1]), Dice_stringToDicePoolModification(tupledArg_5[2]), tupledArg_5[3], (string = tupledArg_5[4], (string === "None") ? void 0 : FSharpMap__get_Item(rangeMap, string)), stringToDamageTypeArray(tupledArg_5[5]), FSharpMap__get_Item(AreaOfEffect_AreaOfEffectOptionMap, tupledArg_5[6]));
    }, weaponResourceClassData);
    const defenseClassMap = MapUtils_createMapFromTuple4List((tupledArg_6) => DefenseClass_tupleToDefenseClass(tupledArg_6[0], tupledArg_6[1], tupledArg_6[2], tupledArg_6[3]), defenseClassData);
    const itemTierMap = MapUtils_createMapFromTuple5List((tupledArg_7) => (new ItemTier_ItemTier(tupledArg_7[0], tupledArg_7[1], tupledArg_7[2], Dice_stringToDicePool(tupledArg_7[3]), tupledArg_7[4])), itemTierData);
    const itemMap = MapUtils_createMapFromTuple6List((tupledArg_8) => {
        let weaponClassMap_1, conduitClassMap_1, weaponResourceClassMap_1;
        return new Item_Item(tupledArg_8[0], (weaponClassMap_1 = weaponClassMap, (conduitClassMap_1 = conduitClassMap, (weaponResourceClassMap_1 = weaponResourceClassMap, collect((className) => {
            if (contains(className, FSharpMap__get_Keys(weaponClassMap_1), {
                Equals: (x_1, y_1) => (x_1 === y_1),
                GetHashCode: stringHash,
            })) {
                return singleton$1(new Item_ItemClass(0, [FSharpMap__get_Item(weaponClassMap_1, className)]));
            }
            else if (contains(className, FSharpMap__get_Keys(conduitClassMap_1), {
                Equals: (x_2, y_2) => (x_2 === y_2),
                GetHashCode: stringHash,
            })) {
                return singleton$1(new Item_ItemClass(1, [FSharpMap__get_Item(conduitClassMap_1, className)]));
            }
            else if (contains(className, FSharpMap__get_Keys(weaponResourceClassMap_1), {
                Equals: (x_3, y_3) => (x_3 === y_3),
                GetHashCode: stringHash,
            })) {
                return singleton$1(new Item_ItemClass(2, [FSharpMap__get_Item(weaponResourceClassMap_1, className)]));
            }
            else if (contains(className, FSharpMap__get_Keys(defenseClassMap), {
                Equals: (x_4, y_4) => (x_4 === y_4),
                GetHashCode: stringHash,
            })) {
                return singleton$1(new Item_ItemClass(3, [FSharpMap__get_Item(defenseClassMap, className)]));
            }
            else {
                return [];
            }
        }, split(tupledArg_8[1], [", "], void 0, 0))))), FSharpMap__get_Item(itemTierMap, tupledArg_8[2]), tupledArg_8[5], tupledArg_8[4]);
    }, itemData);
    const equipmentArray = map$1((tuple) => Equipment_tupleToEquipmentItem(itemMap, tuple[0], tuple[1], tuple[2]), equipmentData);
    const skillStatArray = map$1((tuple_1) => SkillStat_tupleToSkillStat(internalAttributeMap, tuple_1[0], tuple_1[1], tuple_1[2]), skillStatData);
    const vocationArray = map$1((vocationData_1) => {
        let weaponClassMap_2;
        const vocationStatName = vocationData_1[0];
        const vocationGoverningAttributes_1 = stringDescToAttributes(vocationStatName);
        return new VocationStat_VocationStat(vocationStatName, Neg1To4_intToNeg1To4(vocationData_1[1]), vocationGoverningAttributes_1, map$1((weaponClassMap_2 = weaponClassMap, (vocationalSkillStatTuple) => {
            const name_4 = vocationalSkillStatTuple[0];
            const lvl_1 = vocationalSkillStatTuple[1] | 0;
            if (contains(name_4, FSharpMap__get_Keys(weaponClassMap_2), {
                Equals: (x_5, y_5) => (x_5 === y_5),
                GetHashCode: stringHash,
            })) {
                const weaponClass = FSharpMap__get_Item(weaponClassMap_2, name_4);
                return new SkillStat_SkillStat(name_4, Neg1To4_intToNeg1To4(lvl_1), weaponClass.governingAttributes);
            }
            else {
                return new SkillStat_SkillStat(name_4, Neg1To4_intToNeg1To4(lvl_1), vocationGoverningAttributes_1);
            }
        }), vocationData_1[2]));
    }, collect((vocationData) => {
        const vocationDataName = vocationData[0];
        return (vocationDataName === "") ? [] : [[vocationDataName, vocationData[1], collect((skillData) => {
            const skillDataName = skillData[0];
            return (skillDataName !== "") ? [[skillDataName, skillData[1]]] : [];
        }, vocationData[2])]];
    }, vocationDataArray));
    const attributeStatArray = map$1((tuple_2) => Attribute_tupleToAttributeStat(internalAttributeMap, tuple_2[0], tuple_2[1]), attributeStatData);
    const movementSpeedCalculationMap = MapUtils_createMapFromTuple6List((tupledArg_9) => (new MovementSpeedCalculation_MovementSpeedCalculation(tupledArg_9[0], tupledArg_9[1], stringToAttributes(tupledArg_9[2]), tupledArg_9[3], tupledArg_9[4], tupledArg_9[5])), movementSpeedData);
    return Character_createCharacter(skillStatArray, attributeStatArray, equipmentArray, vocationArray, magicSkillMap, magicCombatMap, rangeMap, map$1((tuple_3) => {
        const tupledArg_11 = tuple_3;
        const desc_8 = tupledArg_11[0];
        return [Effects_descToEffect(movementSpeedCalculationMap, desc_8), desc_8, tupledArg_11[1], tupledArg_11[2]];
    }, effectsTableData), MapUtils_createMapFromTuple3List((tupledArg_10) => (new Attribute_AttributeDeterminedDiceMod(tupledArg_10[0], stringToAttributes(tupledArg_10[1]), Dice_stringToDicePoolModification(tupledArg_10[2]))), attributeDeterminedDiceModData), (tupledArg_12 = head$1(carryWeightCalculationData), CarryWeightCalculation_createCarryWeightCalculation(tupledArg_12[0], tupledArg_12[1], tupledArg_12[2], tupledArg_12[3], tupledArg_12[4], tupledArg_12[5])), map$1((tuple_4) => CarryWeightCalculation_tupleToWeightClass(tuple_4[0], tuple_4[1], tuple_4[2], tuple_4[3]), weightClassData));
}

