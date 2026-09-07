(function() {
    if (document.getElementById('decathlon-purchases-modal')) {
        document.getElementById('decathlon-purchases-modal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'decathlon-purchases-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:999999;display:flex;flex-direction:column;font-family:sans-serif;box-sizing:border-box;';
    
    const header = document.createElement('div');
    header.style.cssText = 'padding:15px 25px;background:#0082C3;color:#fff;display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:bold;flex-shrink:0;';
    header.innerHTML = '<span>Decathlon Purchase History</span>';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:28px;cursor:pointer;line-height:1;padding:0 5px;';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.style.cssText = 'padding:25px;overflow-y:auto;flex:1;display:flex;flex-direction:column;box-sizing:border-box;';
    body.innerHTML = '<div style="margin-bottom:15px;position:relative;display:flex;align-items:center;max-width:600px;">' +
                         '<input type="text" id="dec-search" placeholder="Search item name or description..." style="width:100%;padding:10px 36px 10px 14px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box;outline:none;">' +
                         '<span id="dec-clear-btn" style="position:absolute;right:12px;cursor:pointer;font-size:16px;color:#888;display:none;padding:4px;">✕</span>' +
                     '</div>' +
                     '<div id="dec-summary" style="margin-bottom:15px;padding:12px 18px;background:#f8f9fa;border-radius:6px;border:1px solid #e9ecef;font-size:14px;color:#333;display:none;"></div>' +
                     '<div id="dec-status" style="margin-bottom:15px;font-weight:bold;color:#333;">Initializing fetch...</div>' +
                     '<div style="overflow-x:auto;flex:1;"><table id="dec-table" style="width:100%;border-collapse:collapse;font-size:14px;">' +
                     '<thead><tr style="background:#f1f1f1;text-align:left;"><th style="padding:12px;border:1px solid #ddd;">Order / Total</th><th style="padding:12px;border:1px solid #ddd;">Image</th><th style="padding:12px;border:1px solid #ddd;">Product Info</th><th style="padding:12px;border:1px solid #ddd;">Price / Qty</th></tr></thead>' +
                     '<tbody id="dec-tbody"></tbody></table></div>';
                     
    modal.appendChild(header);
    modal.appendChild(body);
    document.body.appendChild(modal);

    const statusEl = document.getElementById('dec-status');
    const summaryEl = document.getElementById('dec-summary');
    const tbodyEl = document.getElementById('dec-tbody');
    const searchInput = document.getElementById('dec-search');
    const clearBtn = document.getElementById('dec-clear-btn');

    let allOrders = [];
    let searchTimeout = null;

    async function fetchWithRetry(url, retries = 3, delay = 1500) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                statusEl.textContent = `Network error (Attempt ${i+1}/${retries}), retrying...`;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    function renderTable(filterText = '') {
        const query = filterText.trim().toLowerCase();
        
        let filteredOrders = allOrders.map(order => {
            const products = Array.isArray(order.orderProducts) ? order.orderProducts : [];
            if (!query) return order;
            
            const matchedProducts = products.filter(item => {
                const name = (item.productName || '').toLowerCase();
                const desc = (item.productDescription || item.description || '').toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
            
            return {
                ...order,
                orderProducts: matchedProducts
            };
        }).filter(order => order.orderProducts.length > 0);

        let totalSpent = 0;
        let totalItemsCount = 0;
        let yearlySummary = {};
        const currency = allOrders[0]?.orderCurrencyCode || 'CZK';

        filteredOrders.forEach(order => {
            let orderItemSpent = 0;
            const year = order.orderDate ? new Date(order.orderDate).getFullYear() : 'Unknown';
            if (!yearlySummary[year]) {
                yearlySummary[year] = { orders: 0, spent: 0, items: 0 };
            }
            yearlySummary[year].orders += 1;

            order.orderProducts.forEach(p => {
                const qty = (p.productQuantity || 1);
                const unitPrice = (p.productUnitPrice !== undefined ? p.productUnitPrice : 0);
                const itemTotal = unitPrice * qty;
                
                totalItemsCount += qty;
                orderItemSpent += itemTotal;
                yearlySummary[year].items += qty;
                yearlySummary[year].spent += itemTotal;
            });

            totalSpent += orderItemSpent;
        });

        const sortedYears = Object.keys(yearlySummary).sort((a, b) => b - a);
        let yearlyTableRows = sortedYears.map(year => {
            const y = yearlySummary[year];
            return `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${year}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${y.orders}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${y.spent} ${currency}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${y.items}</td></tr>`;
        }).join('');

        let yearlyHtml = `
            <div style="margin-top:8px;font-size:13px;">
                <a href="#" id="dec-toggle-yearly" style="color:#0082C3;text-decoration:none;font-weight:bold;">▶ Show Summary Per Year</a>
                <div id="dec-yearly-container" style="display:none;margin-top:8px;">
                    <table style="width:100%;max-width:500px;border-collapse:collapse;background:#fff;font-size:12px;">
                        <thead><tr style="background:#eee;"><th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Year</th><th style="padding:6px 10px;border:1px solid #ddd;text-align:right;">Orders</th><th style="padding:6px 10px;border:1px solid #ddd;text-align:right;">Spent</th><th style="padding:6px 10px;border:1px solid #ddd;text-align:right;">Items</th></tr></thead>
                        <tbody>${yearlyTableRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        summaryEl.innerHTML = `<strong>Summary:</strong> Showing <strong>${filteredOrders.length}</strong> orders | Total Items: <strong>${totalItemsCount}</strong> | Total Spent: <strong>${totalSpent} ${currency}</strong>${yearlyHtml}`;
        summaryEl.style.display = 'block';

        const toggleLink = document.getElementById('dec-toggle-yearly');
        const yearlyContainer = document.getElementById('dec-yearly-container');
        if (toggleLink && yearlyContainer) {
            toggleLink.onclick = (e) => {
                e.preventDefault();
                if (yearlyContainer.style.display === 'none') {
                    yearlyContainer.style.display = 'block';
                    toggleLink.textContent = '▼ Hide Summary Per Year';
                } else {
                    yearlyContainer.style.display = 'none';
                    toggleLink.textContent = '▶ Show Summary Per Year';
                }
            };
        }

        if (filteredOrders.length === 0) {
            tbodyEl.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:#666;">No purchases found matching your filter.</td></tr>';
            return;
        }

        let rowsHtml = '';
        filteredOrders.forEach(order => {
            const orderNumber = order.orderNumber || 'N/A';
            const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleString() : '';
            const orderCurrency = order.orderCurrencyCode || 'CZK';
            const totalPrice = order.orderTotalPrice !== undefined ? `${order.orderTotalPrice} ${orderCurrency}` : '';
            const associationId = order.associationId || '';
            const orderUrl = associationId ? `https://www.decathlon.cz/account/orderTracking?transactionId=${associationId}` : 'https://www.decathlon.cz/';
            
            const products = order.orderProducts;
            const rowSpan = products.length > 0 ? products.length : 1;

            products.forEach((item, index) => {
                const itemName = item.productName || 'Unknown Product';
                const itemUrl = item.productUrl ? `https://www.decathlon.cz/${item.productUrl}` : '#';
                const imgUrl = item.productMedia || '';
                const unitPrice = item.productUnitPrice !== undefined ? item.productUnitPrice : 0;
                const quantity = item.productQuantity || 1;
                const sizeColor = [item.productSize !== 'No Size' ? `Size: ${item.productSize}` : '', item.productColor].filter(Boolean).join(' | ');

                let statusBadges = '';
                if (item.productReturned) {
                    statusBadges += '<br><span style="background:#fce8e6;color:#c5221f;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;display:inline-block;margin-top:4px;">Returned</span>';
                }
                if (item.productCanceled) {
                    statusBadges += '<br><span style="background:#fce8e6;color:#c5221f;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;display:inline-block;margin-top:4px;">Canceled</span>';
                }

                rowsHtml += `<tr style="border-bottom:1px solid #ddd;">`;

                if (index === 0) {
                    rowsHtml += `
                        <td rowspan="${rowSpan}" style="padding:12px;border:1px solid #ddd;vertical-align:top;background:#fafafa;">
                            <a href="${orderUrl}" target="decathlon_shared_window" style="color:#0082C3;text-decoration:none;font-weight:bold;">#${orderNumber}</a>
                            <br><span style="font-size:11px;color:#666;">${orderDate}</span>
                            ${totalPrice ? `<br><span style="font-size:12px;font-weight:bold;color:#333;margin-top:4px;display:inline-block;">Total: ${totalPrice}</span>` : ''}
                        </td>
                    `;
                }

                rowsHtml += `
                    <td style="padding:12px;border:1px solid #ddd;vertical-align:top;text-align:center;">
                        <a href="${itemUrl}" target="decathlon_shared_window">
                            <img src="${imgUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ccc;" alt="${itemName}" onerror="this.src='https://via.placeholder.com/60?text=No+Img'">
                        </a>
                    </td>
                    <td style="padding:12px;border:1px solid #ddd;vertical-align:top;">
                        <a href="${itemUrl}" target="decathlon_shared_window" style="color:#0082C3;text-decoration:none;font-weight:bold;">${itemName}</a>
                        ${sizeColor ? `<br><span style="font-size:12px;color:#555;">${sizeColor}</span>` : ''}
                        <br><span style="font-size:11px;color:#888;">Brand: ${item.productBrand || 'N/A'}</span>
                        ${statusBadges}
                    </td>
                    <td style="padding:12px;border:1px solid #ddd;vertical-align:top;white-space:nowrap;">
                        ${unitPrice} ${orderCurrency} × ${quantity}
                    </td>
                </tr>`;
            });
        });

        tbodyEl.innerHTML = rowsHtml;
    }

    searchInput.oninput = () => {
        clearBtn.style.display = searchInput.value ? 'block' : 'none';
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderTable(searchInput.value);
        }, 300);
    };

    clearBtn.onclick = () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        renderTable('');
    };

    (async function() {
        try {
            statusEl.textContent = `Loading first order (index 0)...`;
            const firstRes = await fetchWithRetry(`https://www.decathlon.cz/web-engage/ajax/myPurchase?from=0&size=1`);
            const firstItems = firstRes && Array.isArray(firstRes.items) ? firstRes.items : [];
            const totalHits = firstRes && typeof firstRes.hits === 'number' ? firstRes.hits : 0;

            if (firstItems.length > 0) {
                allOrders.push(firstItems[0]);
            }

            let from = 1;
            const size = 10;
            let hasMore = totalHits > allOrders.length;

            while (hasMore && from < totalHits) {
                statusEl.textContent = `Loading purchases starting from index ${from} (Total hits: ${totalHits})...`;
                const url = `https://www.decathlon.cz/web-engage/ajax/myPurchase?from=${from}&size=${size}`;
                const data = await fetchWithRetry(url);
                
                const orders = data && Array.isArray(data.items) ? data.items : [];
                
                if (orders.length === 0) {
                    hasMore = false;
                } else {
                    allOrders = allOrders.concat(orders);
                    if (orders.length < size || allOrders.length >= totalHits) {
                        hasMore = false;
                    } else {
                        from += size;
                    }
                }
                if (from > 1000) break;
            }

            statusEl.style.display = 'none';
            
            if (allOrders.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:#666;">No purchases found. Ensure you are logged into your Decathlon account.</td></tr>';
                return;
            }

            renderTable('');

        } catch (err) {
            console.error(err);
            statusEl.textContent = `Error fetching data: ${err.message}. Please check if you are logged in.`;
        }
    })();
})();