function fetchJSON(key, remoteURL, localURL) {
    // try loading from a remote url
    return fetch(remoteURL)
    .then(response => {
        if (!response.ok) {
            throw new Error(response.statusText);
        }

        return response.json();
    })
    .then(json => {
        // save the newest version
        setToLocalStorage(key, json);
        return json;
    })
    // load from local storage as there may be a newer version
    .catch(error => getFromLocalStorage(key))
    // nothing found in local storage - fall back to builtin version
    .catch(error => fetch(localURL).then(response => response.json()))
}
