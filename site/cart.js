const shoppingCarts = new ShoppingCarts();
shoppingCarts.load();

const buttonClass =
    "border w-6 h-6 flex items-center justify-center bg-white hover:shadow cursor-pointer rounded leading-none hover:scale-110 transition-transform duration-200";

async function load() {
    const items = await loadItems();
    const lookup = {};
    for (item of items) {
        lookup[item.store + item.id] = item;
    }

    let cart = null;
    const cartName = getQueryParameter("name");
    if (cartName) {
        for (c of shoppingCarts.carts) {
            if (c.name == cartName) {
                cart = c;
                break;
            }
        }

        // Update cart pricing info
        const items = [];
        for (cartItem of cart.items) {
            const item = lookup[cartItem.store + cartItem.id];
            if (!item) items.push(cartItem);
            else items.push(item);
        }
        cart.items = items;
        shoppingCarts.save();
    }

    const cartDesc = getQueryParameter("cart");
    if (cartDesc) {
        let tokens = cartDesc.split(";");
        cart = {
            name: tokens[0],
            items: [],
            linked: true,
        };
        for (let i = 1; i < tokens.length; i++) {
            const item = lookup[tokens[i]];
            if (item) cart.items.push(item);
        }
        let saveButton = document.querySelector("#save");
        saveButton.classList.remove("hidden");
        saveButton.addEventListener("click", () => {
            let index = shoppingCarts.carts.findIndex((c) => c.name === cart.name);
            if (index != -1) {
                if (confirm("Existierenden Warenkorb '" + cart.name + " überschreiben?")) {
                    shoppingCarts.carts[index] = cart;
                }
            } else {
                shoppingCarts.carts.push(importedCart);
            }
            location.href = "/cart.html?name=" + encodeURIComponent(cart.name);
        });
    }

    if (cart == null) {
        alert("Warenkorb '" + cartName + "' existiert nicht.");
        location.href = "carts.html";
    }

    if (cart.name != "Momentum Eigenmarken Vergleich" && !cart.linked) showSearch(cart, items);

    const canvasDom = document.querySelector("#chart");

    document.querySelector("#sum-container").innerHTML = customCheckbox(`sum`, "Preissumme Gesamt", true, "gray", "gray");
    document.querySelector("#sumstores-container").innerHTML = customCheckbox(`sumstores`, "Preissumme pro Kette", true, "gray", "gray");
    document.querySelector("#todayonly-container").innerHTML = customCheckbox(`todayonly`, "Nur heutige Preise", false, "gray", "gray");

    document.querySelector("#sum").addEventListener("change", () => updateCharts(canvasDom, filter(cart.items)));
    document.querySelector("#sumstores").addEventListener("change", () => updateCharts(canvasDom, filter(cart.items)));
    document.querySelector("#todayonly").addEventListener("change", () => updateCharts(canvasDom, filter(cart.items)));
    document.querySelector("#start").addEventListener("change", () => updateCharts(canvasDom, filter(cart.items)));
    document.querySelector("#end").addEventListener("change", () => updateCharts(canvasDom, filter(cart.items)));

    document.querySelector("#start").value = getOldestDate(cart.items);
    document.querySelector("#end").value = currentDate();

    const filtersStore = document.querySelector("#filters-store");
    filtersStore.innerHTML = `
        ${customCheckbox("all", "<strong>Alle</strong>", true, "gray", "gray")}
        ${STORE_KEYS.map((store) =>
            customCheckbox(store, stores[store].name, stores[store].name.toLowerCase().endsWith("de") ? false : true, stores[store].color, "gray")
        ).join(" ")}
    `;

    filtersStore.querySelectorAll("input").forEach((input) => {
        if (input.id == "all") return;
        input.addEventListener("change", () => showCart(cart));
    });
    filtersStore.querySelector("#all").addEventListener("change", () => {
        STORE_KEYS.forEach((store) => (filtersStore.querySelector(`#${store}`).checked = filtersStore.querySelector("#all").checked));
        showCart(cart);
    });
    document.querySelector("#filter").addEventListener("input", () => showCart(cart));
    showCart(cart);
}

function filter(cartItems) {
    const query = document.querySelector("#filter").value.trim();
    const storeCheckboxes = STORE_KEYS.map((store) => document.querySelector(`#${store}`));
    const checkedStores = STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked);
    let items = [];
    if (query.charAt(0) != "!") {
        for (item of cartItems) {
            if (!checkedStores.includes(item.store)) continue;
            items.push(item);
        }
    } else {
        items = cartItems;
    }
    if (query.length >= 3) items = searchItems(items, document.querySelector("#filter").value, checkedStores, false, 0, 10000, false, false);
    return items;
}

function showSearch(cart, items) {
    const searchDom = document.querySelector("#search");
    searchDom.innerHTML = "";
    newSearchComponent(
        searchDom,
        items,
        null,
        null,
        (header) => {
            header.innerHTML += "<th></th>";
            return header;
        },
        (item, itemDom) => {
            const cell = dom("td", `<input type="button" class="ml-auto ${buttonClass}" value="+">`);
            cell.children[0].addEventListener("click", () => {
                cart.items.push(item);
                shoppingCarts.save();
                document.querySelector("#start").value = getOldestDate(cart.items);
                document.querySelector("#end").value = currentDate();
                showCart(cart);
            });
            cell.classList.add("order-6");
            itemDom.appendChild(cell);
            return itemDom;
        }
    );
    searchDom.querySelector("input").setAttribute("placeholder", "Produkte suchen und hinzufügen...");
}

function updateCharts(canvasDom, items) {
    let startDate = document.querySelector("#start").value;
    let endDate = document.querySelector("#end").value;
    if (start > endDate) {
        let tmp = start;
        start = endDate;
        endDate = tmp;
    }
    showCharts(
        canvasDom,
        items,
        document.querySelector("#sum").checked,
        document.querySelector("#sumstores").checked,
        document.querySelector("#todayonly").checked,
        startDate,
        endDate
    );
}

function showCart(cart) {
    if (cart.items.length == 0) {
        document.querySelector("#noproducts").classList.remove("hidden");
        document.querySelector("#hasproducts").classList.add("hidden");
    } else {
        document.querySelector("#noproducts").classList.add("hidden");
        document.querySelector("#hasproducts").classList.remove("hidden");
    }

    let link = encodeURIComponent(cart.name) + ";";
    for (cartItem of cart.items) {
        link += cartItem.store + cartItem.id + ";";
    }

    document.querySelector("#cartname").innerHTML = `
        Warenkorb '${cart.name}' <a class="text-sm text-primary block hover:underline" href="cart.html?cart=${link}">Teilen</a>
    `;

    const canvasDom = document.querySelector("#chart");
    let items = filter(cart.items);
    if (items.length == cart.items.length) {
        document.querySelector("#numitems").innerText = `${cart.items.length} Artikel`;
    } else {
        document.querySelector("#numitems").innerText = `${items.length} / ${cart.items.length} Artikel`;
    }
    document.querySelector("#json").addEventListener("click", (event) => {
        event.preventDefault();
        downloadFile("items.json", JSON.stringify(items, null, 2));
    });
    updateCharts(canvasDom, items);

    const itemTable = document.querySelector("#cartitems");
    itemTable.innerHTML = "";
    header = dom(
        "thead",
        `<tr class="bg-primary text-white text-left hidden md:table-row uppercase text-sm">
            <th class="text-center">Kette</th>
            <th>Name</th>
            <th>Preis <span class="expander">+</span></th>
            <th></th>
        </tr>`
    );
    const showHideAll = header.querySelectorAll("th:nth-child(3)")[0];
    showHideAll.style["cursor"] = "pointer";
    showHideAll.showAll = true;
    showHideAll.addEventListener("click", () => {
        showHideAll.querySelector(".expander").innerText = showHideAll.querySelector(".expander").innerText == "+" ? "-" : "+";
        itemTable.querySelectorAll(".priceinfo").forEach((el) => (showHideAll.showAll ? el.classList.remove("hidden") : el.classList.add("hidden")));
        showHideAll.showAll = !showHideAll.showAll;
    });
    itemTable.append(header);

    items.forEach((cartItem, idx) => {
        const itemDom = itemToDOM(cartItem);

        const cell = dom(
            "td",
            `
            <label>
                <input type="checkbox" class="hidden peer">
                <span class="peer-checked:bg-blue-700 bg-transparent rounded p-1 text-sm">📈</span>
            </label>
            <input type="button" class="ml-auto ${buttonClass}" value="-">
            <input type="button" class="${buttonClass}" value="▲">
            <input type="button" class="${buttonClass}" value="▼">
        `
        );
        cell.classList.add("order-5", "flex", "items-center", "p-1");

        if (cartItem.chart) cell.children[0].setAttribute("checked", true);
        cell.children[0].addEventListener("change", () => {
            cartItem.chart = cell.children[0].children[0].checked;
            shoppingCarts.save();
            updateCharts(canvasDom, items);
        });

        if (cart.name != "Momentum Eigenmarken Vergleich" && !cart.linked) {
            cell.children[1].addEventListener("click", () => {
                cart.items.splice(idx, 1);
                shoppingCarts.save();
                document.querySelector("#start").value = getOldestDate(cart.items);
                document.querySelector("#end").value = currentDate();
                showCart(cart);
            });

            cell.children[2].addEventListener("click", () => {
                if (idx == 0) return;
                let otherItem = cart.items[idx - 1];
                cart.items[idx - 1] = cartItem;
                cart.items[idx] = otherItem;
                shoppingCarts.save();
                showCart(cart);
            });

            cell.children[3].addEventListener("click", () => {
                if (idx == cart.items.length - 1) return;
                let otherItem = cart.items[idx + 1];
                cart.items[idx + 1] = cartItem;
                cart.items[idx] = otherItem;
                shoppingCarts.save();
                showCart(cart);
            });
        } else {
            cell.querySelectorAll("input[type='button']").forEach((button) => button.classList.add("hidden"));
        }

        itemDom.append(cell);
        itemTable.append(itemDom);
    });
}

load();
