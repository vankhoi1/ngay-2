// URL dẫn tới file JSON trên GitHub (Dùng link raw nha fen)
const URL_API = 'https://raw.githubusercontent.com/TEN_USER_CUA_FEN/TEN_REPO/main/db.json';

const productList = document.getElementById('product-list');

async function loadProducts() {
    try {
        const response = await fetch(URL_API);
        const data = await response.json();
        
        // Xóa thông báo đang tải
        productList.innerHTML = '';

        data.forEach(product => {
            const card = document.createElement('div');
            card.classList.add('product-card');

            // Xử lý ảnh (đề phòng link ảnh lỗi)
            const imgUrl = product.images[0] || 'https://via.placeholder.com/600x400';

            card.innerHTML = `
                <img src="${imgUrl}" alt="${product.title}">
                <p class="category">${product.category.name}</p>
                <h3>${product.title}</h3>
                <p class="price">$${product.price}</p>
                <p style="font-size: 0.9rem">${product.description.substring(0, 50)}...</p>
            `;
            
            productList.appendChild(card);
        });
    } catch (error) {
        console.error('Lỗi rồi fen ơi:', error);
        productList.innerHTML = '<p>Không load được data rồi, check lại link API nha!</p>';
    }
}

loadProducts();